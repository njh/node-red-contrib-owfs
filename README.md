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

In addition the owserver port and/or host can be specified in **msg.host** and **msg.port**, overriding any settings in the node configuration.

To trigger reading sensors periodically, use an Inject node to send messages every X seconds.


Example
-------

This example shows a simple flow to read a 1-wire temperature sensor using owfs and publish the reading to MQTT as a retained message.

![screenshot](https://github.com/njh/node-red-contrib-owfs/raw/master/screenshot.png)

In this flow, the inject node is used to specify the name of the 1-wire device to be read from, this triggers every 10 seconds. When the owfs node receives this message, it makes a query to owserver, running on the same machine. It takes a temperature reading and outputs the temperature value in msg.payload.

Then change node is used to set msg.retain to true - this causes MQTT to keep a copy of the latest temperature reading, so when a new client subscribes, it immediately gets a value.

The flow can be downloaded from the Node-Red Flow Library here:
http://flows.nodered.org/flow/b11cfe3a7728a297e44d


Hardare Tested
--------------

* [DS18B20 Temperature Sensor](http://www.maximintegrated.com/en/products/DS18B20)
* [DS9490R USB Host Adapter](http://www.maximintegrated.com/en/products/DS9490R)
* [RPI2: 1-Wire Host Adapter for Raspberry Pi](http://www.sheepwalkelectronics.co.uk/product_info.php?cPath=22&products_id=30)
* [SWE1: Temperature Sensor](http://www.sheepwalkelectronics.co.uk/product_info.php?cPath=23&products_id=53)
* [SWE3: Humidity Sensor Module](http://www.sheepwalkelectronics.co.uk/product_info.php?cPath=23&products_id=55)
* [SWE4: Dual Channel I/O Module](http://www.sheepwalkelectronics.co.uk/product_info.php?cPath=23&products_id=59)
* [DS1822 Econo 1-Wire Digital Thermometer](http://www.maximintegrated.com/en/products/DS1822)
* [DS2401 Silicon Serial Number](http://www.maximintegrated.com/en/products/DS2401)
* [DS2406 Dual Addressable Switch Plus 1Kb Memory](http://www.maximintegrated.com/en/products/DS2406)
* [DS2408 1-Wire 8-Channel Addressable Switch](http://www.maximintegrated.com/en/products/DS2408)
* [DS2438 Smart Battery Monitor](http://www.maximintegrated.com/en/products/DS2438) (often used as a temperature and humidity sensor)


[Node-RED]:  http://nodered.org/
[1-wire]:    http://www.maximintegrated.com/en/products/comms/one-wire.html
[owfs]:      http://owfs.org/
[owserver]:  http://owfs.org/index.php?page=owserver
