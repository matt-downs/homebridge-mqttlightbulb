"use strict";

let Service, Characteristic;
const mqtt = require("mqtt");
const contextEnum = Object.freeze({
  fromSetValue: 1
});

module.exports = homebridge => {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory(
    "homebridge-sonoff-tasmota-mqtt-hsb",
    "sonoff-tasmota-mqtt-hsb",
    SonoffTasmotaMqttHsb
  );
};

class SonoffTasmotaMqttHsb {
  constructor(log, config) {
    this.log = log;
    this.name = config["name"];
    this.url = config["url"];
    this.client_Id =
      "mqttjs_" +
      Math.random()
      .toString(16)
      .substr(2, 8);
    this.options = {
      keepalive: 10,
      clientId: this.client_Id,
      protocolId: "MQTT",
      protocolVersion: 4,
      clean: true,
      reconnectPeriod: 1000,
      connectTimeout: 30 * 1000,
      will: {
        topic: "WillMsg",
        payload: "Connection Closed abnormally..!",
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
      .on("get", this.getStatus.bind(this))
      .on("set", this.setStatus.bind(this));
    this.service
      .getCharacteristic(Characteristic.Brightness)
      .on("get", this.getBrightness.bind(this))
      .on("set", this.setBrightness.bind(this));
    this.service
      .getCharacteristic(Characteristic.Hue)
      .on("get", this.getHue.bind(this))
      .on("set", this.setHue.bind(this));
    this.service
      .getCharacteristic(Characteristic.Saturation)
      .on("get", this.getSaturation.bind(this))
      .on("set", this.setSaturation.bind(this));

    // connect to MQTT broker
    this.client = mqtt.connect(
      this.url,
      this.options
    );
    this.client.on("error", err => {
      this.log("Error event on MQTT:", err);
    });
    this.client.on("message", this.mqttHandleMessage.bind(this));
    this.client.subscribe(this.topics.getOn);
    this.client.subscribe(this.topics.getHsb);
  }

  mqttHandleMessage(topic, message) {
    switch (topic) {
      case this.topics.getOn:
        {
          var status = message.toString();
          this.on = status === "ON" ? true : false;
          this.service
          .getCharacteristic(Characteristic.On)
          .setValue(this.on, undefined, contextEnum.fromSetValue);

          break;
        }

      case this.topics.getHsb:
        {
          try {
            // Pull the HSB values from the message
            // eg message: {"POWER":"ON","Dimmer":100,"Color":"FF7F81","HSBColor":"359,50,100","Channel":[100,50,51]}
            const hsb = JSON.parse(message).HSBColor;
            [this.hue, this.saturation, this.brightness] = hsb.split(",");
            //this.on = brightness > 0;

            // Update the accessory's state
            this.service
              .getCharacteristic(Characteristic.On)
              .setValue(this.on, undefined, contextEnum.fromSetValue);
            this.service
              .getCharacteristic(Characteristic.Hue)
              .setValue(this.hue, undefined, contextEnum.fromSetValue);
            this.service
              .getCharacteristic(Characteristic.Saturation)
              .setValue(this.saturation, undefined, contextEnum.fromSetValue);
            this.service
              .getCharacteristic(Characteristic.Brightness)
              .setValue(this.brightness, undefined, contextEnum.fromSetValue);
          } catch (error) {
            console.log("Error: malformed HSBColor result:");
            console.log(message);
          }

          break;
        }

      default:
        break;
    }
  }

  mqttPublishHsb() {
    const message = `${this.hue},${this.saturation},${this.brightness},`;
    this.client.publish(this.topics.setHsb, message, {
      retain: this.retain
    });
  }

  mqttPublishStatus() {
    const message = this.on ? "On" : "Off";
    this.client.publish(this.topics.setOn, message, {
      retain: this.retain
    });
  }

  getStatus(callback) {
    callback(null, this.on);
  }
  setStatus(status, callback, context) {
    if (context !== contextEnum.fromSetValue) {
      this.on = status;
      this.mqttPublishStatus();
    }
    callback();
  }

  getBrightness(callback) {
    callback(null, this.brightness);
  }
  setBrightness(brightness, callback, context) {
    if (context !== contextEnum.fromSetValue) {
      this.brightness = brightness;
      this.mqttPublishHsb();
    }
    callback();
  }

  getHue(callback) {
    callback(null, this.hue);
  }
  setHue(hue, callback, context) {
    if (context !== contextEnum.fromSetValue) {
      this.hue = hue;
      this.mqttPublishHsb();
    }
    callback();
  }

  getSaturation(callback) {
    callback(null, this.saturation);
  }
  setSaturation(saturation, callback, context) {
    if (context !== contextEnum.fromSetValue) {
      this.saturation = saturation;
      this.mqttPublishHsb();
    }
    callback();
  }

  getServices() {
    return [this.service];
  }
}
