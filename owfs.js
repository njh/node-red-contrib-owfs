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

    function OwfsNode(n) {
        RED.nodes.createNode(this,n);
        this.host = n.host;
        this.port = n.port;
        this.paths = n.paths;

        var node = this;
        node.on("input", function(msg) {
            var host = msg.host  ||  node.host;
            var port = msg.port  ||  node.port;
            var client = new owfs.Client(host, port);
            var paths = node.paths;
            if (msg.topic) {
                paths = [msg.topic];
            }

            if (host && host.length > 0 && port && port.length > 0) {
              if (paths && paths.length > 0) {
                  // Query owfs for each path, one at a time
                  async.eachSeries(paths, function(path, callback) {
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
              } else {
                  node.warn("no owfs paths configured and msg.topic is empty");
              }
          } else {
              node.warn("missing host or port configuration and not provided by msg.host and msg.port");
          }
        });
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
                            var count = 0;
                            results.forEach(function(device) {
                                count++;
                                device.forEach(function(property) {
                                    if (property && !property.match(blacklist)) {
                                        paths.push(property.substr(1));
                                    }
                                });
                            });
                            res.send({'deviceCount': count, 'paths': paths.sort()});
                        } else {
                            res.send({'error': error.message});
                        }
                    }
                );
            } else {
                res.send({'error': error.message});
            }
        });
    });
}
