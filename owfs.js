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
    var util = require("util");

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
        this.serverConfig = RED.nodes.getNode(this.server);
        var node = this;
        if (this.serverConfig) {
            this.client = new owfs.Client(this.serverConfig.server, this.serverConfig.port);
            this.on("input", function(msg) {
                if (msg.topic) {
                    this.client.read(msg.topic, function(error, result) {
                        if (!error) {
                            msg.payload = parseFloat(result);
                            node.send(msg);
                        } else {
                            this.error(error);
                        }
                    });
                } else {
                    this.error("missing topic in message to owfs");
                }
            });
        } else {
            this.error("missing server configuration for owfs");
        }
    }
    RED.nodes.registerType("owfs",OwfsNode);
}
