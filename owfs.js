/**
 * Copyright 2014 Nicholas Humfrey
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

    // The OWFS Server Definition - this opens (and closes) the connection
    function OWFSServerNode(n) {
        RED.nodes.createNode(this,n);
        this.server = n.server;
        this.port = n.port;
    }
    RED.nodes.registerType("owfs-server", OWFSServerNode);

    function OwfsNode(n) {
        RED.nodes.createNode(this,n);
        this.server = n.server;
        this.paths = n.paths;
        this.serverConfig = RED.nodes.getNode(this.server);

        var node = this;
        if (node.serverConfig && node.serverConfig.server && node.serverConfig.port) {
            node.on("input", function(msg) {
                var client = new owfs.Client(node.serverConfig.server, node.serverConfig.port);
                var paths = node.paths;
                if (msg.topic) {
                    paths = [msg.topic];
                }
                
                if (paths && paths.length > 0) {
                    // Check if paths is empty
                    paths.forEach(function(path) {
                        client.read(path, function(error, result) {
                            if (!error) {
                                if (result.match(/^\-?\d+\.\d+$/)) {
                                    msg.payload = parseFloat(result);
                                } else if (result.match(/^\-?\d+$/)) {
                                    msg.payload = parseInt(result);
                                } else {
                                    msg.payload = result;
                                }
                                msg.topic = path;
                                node.send(msg);
                            } else {
                                node.error(error);
                            }
                        });
                    });
                } else {
                    node.warn("no owfs paths configured and msg.topic is empty");
                }
            });
        } else {
            node.error("missing server configuration for owfs");
        }
    }
    RED.nodes.registerType("owfs",OwfsNode);

    RED.httpAdmin.get("/owfs/dirall",function(req,res) {
        var blacklist = new RegExp("/(?:address|crc8|errata|family|id|locator|r_[a-z]+)$");
        if (!req.query.host) {
            return res.status(400).send({'error': "Missing 'host' parameter in query string"});
        } else if (!req.query.port) {
            return res.status(400).send({'error': "Missing 'port' parameter in query string"});
        }

        var client = new owfs.Client(req.query.host, req.query.port);
        var node = this;
        client.dirall("/",function(error, directories) {
            if (!error) {
                async.mapSeries(directories,
                    function(directory,cb) {
                        client.dirall(directory,cb);
                    },
                    function(error, results) {
                        if (!error) {
                            var paths = [];
                            results.forEach(function(device) {
                                device.forEach(function(property) {
                                    if (!property.match(blacklist)) {
                                        paths.push(property.substr(1));
                                    }
                                });
                            });
                            res.send({'paths': paths.sort()});
                        } else {
                            console.log("Failed to get properties for device: "+error);
                            res.status(500).send({'error': error});
                        }
                    }
                );
            } else {
                console.log("Failed to get list of devices: "+error);
                res.status(500).send({'error': error});
            }
        });
    });
}
