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
    var Promise = require("bluebird");

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
    
    function parseResult(result) {
        if (typeof result.match === 'function') {
            if (result.match(/^\-?\d+\.\d+$/)) {
                return parseFloat(result);
            } else if (result.match(/^\-?\d+$/)) {
                return parseInt(result);
            }
        }
        return result;
    }

    function OwfsNode(n) {
        RED.nodes.createNode(this, n);
        this.host = n.host;
        this.port = n.port;
        this.paths = n.paths;
        this.mode = n.mode;
        this.uncached = n.uncached;

        var node = this;
        node.on("input", function(msg) {
            var host = msg.host || node.host;
            var port = msg.port || node.port || 4304;
            var mode = msg.mode || node.mode || 'read';
            var uncached = msg.hasOwnProperty('uncached') ? msg.uncached : node.uncached;
            if (!host || host.length < 1) {
                node.warn("missing host configuration and not provided by msg.host");
                node.status({fill:"red", shape:"ring", text:"No host"});
                return;
            }

            var paths = msg.topic || node.paths;
            if (!Array.isArray(paths)) {
                paths = [paths];
            }
            if (!paths || paths.length < 1) {
                node.warn("no owfs paths configured and msg.topic is empty");
                node.status({fill:"red", shape:"ring", text:"No path"});
                return;
            }

            var client = new owfs.Client(host, port);
            var clientRead = Promise.promisify(client.read, {context: client});
            var clientWrite = Promise.promisify(client.write, {context: client});

            if (mode == 'write') {
                var performRequest = function(path) {
                    return clientWrite(path, msg.payload).then(function(result) {
                        if (result[0].header.ret == 0) {
                            return "ok";
                        } else {
                            return result[0].header.ret;
                        }
                    });
                }
                node.status({fill:"blue", shape:"dot", text:"Writing"});
            } else {
                var performRequest = function(path) {
                    if (uncached) {
                        return clientRead('uncached/' + path);
                    } else {
                        return clientRead(path);
                    }
                }
                node.status({fill:"blue", shape:"dot", text:"Reading"});
            }

            var sendResult = function(result, index) {
                msg.payload = parseResult(result);
                msg.topic = paths[index];
                msg.timestamp = Date.now();
                node.send(msg);
            };

            Promise
                .mapSeries(paths, performRequest)
                .each(sendResult)
                .then(function() {
                    node.status({});
                })
                .catch(function(error) {
                    node.status({fill:"red", shape:"ring", text:"Error"});
                    if ('msg' in error) {
                        node.error(error.msg, msg);
                    } else {
                        node.error(error, msg);
                    }
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
