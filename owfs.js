/**
 * Copyright 2014-2016 Nicholas Humfrey
 * Copyright 2013 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

module.exports = function(RED) {
    "use strict";
    var owfs = require("owfs");
    var async = require("async");
    var Promise = require("bluebird");
    var ERR_RESET = "Device possibly resetting";

    var dirallslash = Promise.promisify(
        owfs.Client.prototype.dirallslash
    );

    function recursiveDirall(client, path, blacklist) {
        return dirallslash.call(client, path).then(function(entries) {
            return Promise.filter(entries, function(entry) {
                // Filter out any paths that match the blacklist
                return !blacklist || !entry.match(blacklist);
            }).mapSeries(function(entry) {
                // We use mapSeries, to prevent lots of concurrent connections to owfs
                if (entry.slice(-1) == '/') {
                    return recursiveDirall(client, entry, blacklist);
                } else {
                    return entry;
                }
            });
        });
    }

    function flattenArrayOfArrays(a, r) {
        if (!r) r = [];
        a.forEach(function(item) {
            if (Array.isArray(item)) {
                flattenArrayOfArrays(item, r);
            } else {
                r.push(item);
            }
        });
        return r;
    }

    function OwfsNode(n) {
        RED.nodes.createNode(this, n);
        this.host = n.host;
        this.port = n.port;
        this.paths = n.paths;
        this.retries = n.retries;
        this.interval = n.interval;
        this.retry_on_85 = n.retry_on_85;

        var node = this;
        node.on("input", function(msg) {
            var host = msg.host || node.host;
            var port = msg.port || node.port || 4304;
            if (!host || host.length < 1) {
                node.warn("missing host configuration and not provided by msg.host");
                return;
            }

            var paths = msg.topic || node.paths;
            if (!Array.isArray(paths)) {
                paths = [paths];
            }
            if (!paths || paths.length < 1) {
                node.warn("no owfs paths configured and msg.topic is empty");
                return;
            }

            var client = new owfs.Client(host, port);

            // Query owfs for each path, one at a time
            async.eachSeries(paths, function(path, callback) {
                async.retry({times: parseInt(node.retries,10)+1, interval: node.interval}, function(cb, results) {
                    client.read(path, function(error, result) {
                        if ( !error && result === "85" && node.retry_on_85 ) {
                            // a value of 85 has been read and the flag is set to treat this as a possible error
                            error = {msg: ERR_RESET, value: result};
                            result = null;
                        }
                        cb(error, result);
                    });
                }, function(error, result) {
                    // first check to see whether this is an 85 error
                    if (error && error.msg === ERR_RESET) {
                        // it is, but retries have not helped so assume it is actually the value read
                        result = error.value
                        error = null;
                    }
                    if (!error) {
                        if (result.match(/^\-?\d+\.\d+$/)) {
                            msg.payload = parseFloat(result);
                        } else if (result.match(/^\-?\d+$/)) {
                            msg.payload = parseInt(result);
                        } else {
                            msg.payload = result;
                        }
                        msg.topic = path;
                        msg.timestamp = Date.now();
                        node.send(msg);
                    } else {
                        if ('msg' in error) {
                            node.error(error.msg, msg);
                        } else {
                            node.error(error, msg);
                        }
                    }
                    callback();
                });
            });
        });
    }
    RED.nodes.registerType("owfs", OwfsNode);

    RED.httpAdmin.get("/owfs/dirall", function(req, res) {
        if (!req.query.host) {
            return res.status(400).send({
                'error': "Missing 'host' parameter in query string"
            });
        } else if (!req.query.port) {
            return res.status(400).send({
                'error': "Missing 'port' parameter in query string"
            });
        }

        var blacklist = new RegExp("/(?:address|crc8|errata/|family|id|locator|pages/|r_[a-z]+)$");
        var client = new owfs.Client(req.query.host, req.query.port);

        recursiveDirall(client, "/", blacklist)
            .then(function(paths) {
                res.send({
                    'deviceCount': paths.length,
                    'paths': flattenArrayOfArrays(paths).map(function(path) {
                        // Strip off the first slash - MQTT style
                        return path.substr(1)
                    })
                });
            })
            .catch(function(error) {
                res.send({
                    'error': error.message
                });
            });
    });
}
