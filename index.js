// MQTT Switch Accessory plugin for HomeBridge
//
// Remember to add accessory to config.json. Example:
//
// "accessories": [{
// 	"accessory": "mqttlightbulb",
// 	"name": "PUT THE NAME OF YOUR SWITCH HERE",
// 	"url": "PUT URL OF THE BROKER HERE",
// 	"username": "PUT USERNAME OF THE BROKER HERE",
// 	"password": "PUT PASSWORD OF THE BROKER HERE"
// 	"caption": "PUT THE LABEL OF YOUR SWITCH HERE",
// 	"topics": {
// 		"getOn": "stat/sonoff-rgb/POWER",
// 		"setOn": "cmnd/sonoff-rgb/POWER",
// 		"getBrightness": "stat/sonoff-rgb/Dimmer",
// 		"setBrightness": "cmnd/sonoff-rgb/Dimmer",
// 		"getHue": "<topic to get the hue>",
// 		"setHue": "<topic to set the hue>",
// 		"getSaturation": "<topic to get the saturation>",
// 		"setSaturation": "<topic to set the saturation>"
// new
// getHsb
// setHsb
// 	}
// }],
//
// When you attempt to add a device, it will ask for a "PIN code".
// The default code for all HomeBridge accessories is 031-45-154.

'use strict';

var Service, Characteristic;
var mqtt = require("mqtt");


function mqttlightbulbAccessory(log, config) {
	this.log = log;
	this.name = config["name"];
	this.url = config["url"];
	this.client_Id = 'mqttjs_' + Math.random().toString(16).substr(2, 8);
	this.options = {
		keepalive: 10,
		clientId: this.client_Id,
		protocolId: 'MQTT',
		protocolVersion: 4,
		clean: true,
		reconnectPeriod: 1000,
		connectTimeout: 30 * 1000,
		will: {
			topic: 'WillMsg',
			payload: 'Connection Closed abnormally..!',
			qos: 0,
			retain: false
		},
		username: config["username"],
		password: config["password"],
		rejectUnauthorized: false
	};
	this.caption = config["caption"];
	this.retain = config["retain"];
	this.topics = config["topics"];

	// Accessory status
	this.on = false;
	this.hue = 0; // 0-360
	this.saturation = 0; // 0-100
	this.brightness = 0; // 0-100

	this.service = new Service.Lightbulb(this.name);
	this.service
		.getCharacteristic(Characteristic.On)
		.on('get', this.getStatus.bind(this))
		.on('set', this.setStatus.bind(this));
	this.service
		.getCharacteristic(Characteristic.Brightness)
		.on('get', this.getBrightness.bind(this))
		.on('set', this.setBrightness.bind(this));
	this.service
		.getCharacteristic(Characteristic.Hue)
		.on('get', this.getHue.bind(this))
		.on('set', this.setHue.bind(this));
	this.service
		.getCharacteristic(Characteristic.Saturation)
		.on('get', this.getSaturation.bind(this))
		.on('set', this.setSaturation.bind(this));

	// connect to MQTT broker
	this.client = mqtt.connect(this.url, this.options);
	var that = this;
	this.client.on('error', function (err) {
		that.log('Error event on MQTT:', err);
	});

	this.client.on('message', function (topic, message) {

		if (topic == that.topics.getOn) {
			var status = message.toString();
			that.on = (status === "On" ? true : false);
			that.service.getCharacteristic(Characteristic.On).setValue(that.on, undefined, 'fromSetValue');
		}

		if (topic == that.topics.getHsb) {
			try {
				// Pull the HSB values from the message
				// eg message: {"POWER":"ON","Dimmer":100,"Color":"FF7F81","HSBColor":"359,50,100","Channel":[100,50,51]}
				let hsb = JSON.parse(message).HSBColor;
				[that.hue, that.saturation, that.brightness] = hsb.split(',');
				that.on = brightness > 0;

				// Update the accessory's state
				that.service.getCharacteristic(Characteristic.On).setValue(that.on, undefined, 'fromSetValue');
				that.service.getCharacteristic(Characteristic.Hue).setValue(that.hue, undefined, 'fromSetValue');
				that.service.getCharacteristic(Characteristic.Saturation).setValue(that.saturation, undefined, 'fromSetValue');
				that.service.getCharacteristic(Characteristic.Brightness).setValue(that.brightness, undefined, 'fromSetValue');

			} catch (error) {
				console.log('Error: malformed HSBColor result:');
				console.log(message);
			}
		}
	});
	this.client.subscribe(this.topics.getOn);
	this.client.subscribe(this.topics.getHsb);

	this.publishHsb = () => {
		let message = `${this.hue},${this.saturation},${this.brightness},`;
		this.client.publish(this.topics.setHsb, message, {
			retain: this.retain
		});
	}

	this.publishOn = () => {
		let message = this.on ? "On" : "Off";
		this.client.publish(this.topics.setOn, message, {
			retain: this.retain
		});
	}
}

module.exports = function (homebridge) {
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;

	homebridge.registerAccessory("homebridge-mqttlightbulb", "mqttlightbulb", mqttlightbulbAccessory);
}

mqttlightbulbAccessory.prototype.getStatus = function (callback) {
	callback(null, this.on);
}

mqttlightbulbAccessory.prototype.setStatus = function (status, callback, context) {
	if (context !== 'fromSetValue') {
		this.on = status;

		this.publishOn();
	}
	callback();
}

mqttlightbulbAccessory.prototype.getBrightness = function (callback) {
	callback(null, this.brightness);
}

mqttlightbulbAccessory.prototype.setBrightness = function (brightness, callback, context) {
	if (context !== 'fromSetValue') {
		this.brightness = brightness;

		this.publishHsb();
	}
	callback();
}

mqttlightbulbAccessory.prototype.getHue = function (callback) {
	callback(null, this.hue);
}

mqttlightbulbAccessory.prototype.setHue = function (hue, callback, context) {
	if (context !== 'fromSetValue') {
		this.hue = hue;

		this.publishHsb();
	}
	callback();
}

mqttlightbulbAccessory.prototype.getSaturation = function (callback) {
	callback(null, this.saturation);
}

mqttlightbulbAccessory.prototype.setSaturation = function (saturation, callback, context) {
	if (context !== 'fromSetValue') {
		this.saturation = saturation;

		this.publishHsb();
	}
	callback();
}

mqttlightbulbAccessory.prototype.getServices = function () {
	return [this.service];
}