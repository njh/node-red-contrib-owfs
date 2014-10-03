node-red-contrib-owfs
=====================

A [Node-RED] node for talking to [1-wire] devices using an [owfs] [owserver] instance.


Install
-------

Run the following command in the root directory of your Node-RED install

    npm install node-red-contrib-owfs


Usage
-----

Install [owfs], either on the same system as Node-RED, or a system that can be reached over TCP. This node communicates with owfs using the owserver protocol - so owserver must be running.

The device property to read from is specified in the **msg.topic**, for example <code>28.0080BE21AA00/temperature</code>. The reading will be output in **msg.payload**.

To trigger reading sensors periodically, use an inject node to send messages every X seconds.



[Node-RED]:  http://nodered.org/
[1-wire]:    http://www.maximintegrated.com/en/products/comms/one-wire.html
[owfs]:      http://owfs.org/
[owserver]:  http://owfs.org/index.php?page=owserver
