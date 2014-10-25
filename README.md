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

One or more owfs paths can be selected in the node edit dialog. Upon receiving a message on the input the node, it will request each of the values in turn from owfs and places the reading in **msg.payload**.

Alternatively a device path can be specified in the **msg.topic** field, for example <code>28.0080BE21AA00/temperature</code>. This will override any paths selected in the edit dialog.

To trigger reading sensors periodically, use an Inject node to send messages every X seconds.

Hardare Tested
--------------

* [DS18B20 Temperature Sensor](http://www.maximintegrated.com/en/products/DS18B20)
* [DS9490R USB Host Adapter](http://www.maximintegrated.com/en/products/DS9490R)
* [RPI2: 1-Wire Host Adapter for Raspberry Pi](http://www.sheepwalkelectronics.co.uk/product_info.php?cPath=22&products_id=30)
* [SWE1: Temperature Sensor](http://www.sheepwalkelectronics.co.uk/product_info.php?cPath=23&products_id=53)
* [SWE3: Humidity Sensor Module](http://www.sheepwalkelectronics.co.uk/product_info.php?cPath=23&products_id=55)



[Node-RED]:  http://nodered.org/
[1-wire]:    http://www.maximintegrated.com/en/products/comms/one-wire.html
[owfs]:      http://owfs.org/
[owserver]:  http://owfs.org/index.php?page=owserver
