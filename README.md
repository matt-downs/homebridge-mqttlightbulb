# homebridge-sonoff-tasmota-mqtt-hsb

A homebridge plugin for RGB LED devices running the [Sonoff-Tasmota](https://github.com/arendst/Sonoff-Tasmota/wiki/MagicHome-LED-strip-controller) firmware, such as the [MagicHome LED strip controller](https://github.com/arendst/Sonoff-Tasmota/wiki/MagicHome-LED-strip-controller).

This plugin uses the `HsbColor` mqtt command to interface with each device, so it should support all of [these](https://github.com/arendst/Sonoff-Tasmota/wiki/Commands#ws2812-ailight-sonoff-led-b1-bn-sz01-h801-and-magichome) devices.

Project based off [homebridge-mqttlightbulb by ameeuw](https://github.com/ameeuw/homebridge-mqttlightbulb).

# Installation

Follow the instruction in [homebridge](https://www.npmjs.com/package/homebridge) for the homebridge server installation.
The plugin is published through [NPM](https://www.npmjs.com/package/homebridge-mqttlightbulb) and should be installed "globally" by typing:

```
npm install -g homebridge-sonoff-tasmota-mqtt-hsb
```

# Configuration

Remember to configure the plugin in config.json in your home directory inside the .homebridge directory. Configuration example:

```javascript
"accessories": [
  {
    "accessory": "sonoff-tasmota-mqtt-hsb",
    "name": "MagicHome LED strip controller",
    "url": "mqtt://0.0.0.0",
    "username": "<username>",
    "password": "<password>",
    "caption": "<label>",
    "topics": {
      "getOn": "stat/sonoff/Power",
      "setOn": "cmnd/sonoff/Power",
      "setHsb": "cmnd/sonoff/HSBColor",
      "getHsb": "stat/sonoff/HSBColor"
    }
  }
],
```
