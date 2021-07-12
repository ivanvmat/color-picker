"use strict";
/**
* ColorPicker control
**/
function ColorPickerControl(cfg) {
    // configuration
    let config = Object.assign({
        container: document.body,
        theme: 'dark',
        debug: false,
        use_alpha: true,
        color: {
            r: 255,
            g: 255,
            b: 255
        }
    }, cfg);
    
    // private variables
    let color_wheel,
        brightness_slider,
        tab_selection_buttons,
        color_wheel_change_handler,
        brightness_slider_change_handler,
        red_input,
        green_input,
        blue_input,
        hue_input,
        saturation_input,
        brightness_input,
        hex_input, 
        alpha_input,  
        tab_selection_handler,
        hue_input_change_handler,
        saturation_input_change_handler,
        brightness_input_change_handler,
        red_input_change_handler,
        green_input_change_handler,
        blue_input_change_handler,
        alpha_input_change_handler,
        hex_input_change_handler,
        color_picker_control = this,
        self = this,
        utils = {
            hsvToHsl: function (hue, saturation, value) {
                saturation /= 100;
                value /= 100;
        
                const lightness = (2 - saturation) * value / 2;
        
                if (lightness !== 0) {
                    if (lightness === 1) {
                        saturation = 0;
                    } else if (lightness < 0.5) {
                        saturation = saturation * value / (lightness * 2);
                    } else {
                        saturation = saturation * value / (2 - lightness * 2);
                    }
                }
        
                return [
                    hue,
                    saturation * 100,
                    lightness * 100
                ];
            },
            hslToHsv: function (hue, saturation, lightness) {
                saturation /= 100;
                lightness /= 100;
                saturation *= lightness < 0.5 ? lightness : 1 - lightness;
            
                const ns = (2 * saturation / (lightness + saturation)) * 100;
                const value = (lightness + saturation) * 100;
                return [hue, isNaN(ns) ? 0 : ns, value];
            },
            hsvToRgb: function (hue, saturation, value) {
                hue = (hue / 360) * 6;
                saturation /= 100;
                value /= 100;
        
                const i = Math.floor(hue);
        
                const f = hue - i;
                const p = value * (1 - saturation);
                const q = value * (1 - f * saturation);
                const t = value * (1 - (1 - f) * saturation);
        
                const mod = i % 6;
                const red = [value, q, p, p, t, value][mod];
                const green = [t, value, value, q, p, p][mod];
                const blue = [p, p, t, value, value, q][mod];
        
                return [
                    (red * 255),
                    (green * 255),
                    (blue * 255)
                ];
            },
            rgbToHsv: function (red, green, blue) {
                red /= 255;
                green /= 255;
                blue /= 255;
        
                const minVal = Math.min(red, green, blue);
                const maxVal = Math.max(red, green, blue);
                const delta = maxVal - minVal;
        
                let hue, saturation;
                const value = maxVal;
                if (delta === 0) {
                    hue = saturation = 0;
                } else {
                    saturation = delta / maxVal;
                    const dr = (((maxVal - red) / 6) + (delta / 2)) / delta;
                    const dg = (((maxVal - green) / 6) + (delta / 2)) / delta;
                    const db = (((maxVal - blue) / 6) + (delta / 2)) / delta;
        
                    if (red === maxVal) {
                        hue = db - dg;
                    } else if (green === maxVal) {
                        hue = (1 / 3) + dr - db;
                    } else if (blue === maxVal) {
                        hue = (2 / 3) + dg - dr;
                    }
        
                    if (hue < 0) {
                        hue += 1;
                    } else if (hue > 1) {
                        hue -= 1;
                    }
                }
        
                return [
                    (hue * 360),
                    (saturation * 100),
                    (value * 100)
                ];
            },
            hsvToHex: function (hue, saturation, value) {
                return utils.hsvToRgb(hue, saturation, value).map(v =>
                    Math.round(v).toString(16).padStart(2, '0')
                );
            },
            hexToHsv: function (hex) {
                hex = hex.trim().toLowerCase().replace(/ /g, '').replace(/[^A-Za-z0-9\s]/g,'');
                return utils.rgbToHsv(...hex.match(/.{2}/g).map(v => parseInt(v, 16)));
            },
            hexToRgb: function ( hex ) {
                var r,g,b;
                hex = hex.trim().toLowerCase().replace(/ /g, '').replace(/[^A-Za-z0-9\s]/g,'');
                r = hex.charAt(0) + '' + hex.charAt(1);
                g = hex.charAt(2) + '' + hex.charAt(3);
                b = hex.charAt(4) + '' + hex.charAt(5);
                r = parseInt( r,16 );
                g = parseInt( g,16 );
                b = parseInt( b ,16);
                return [
                    r, 
                    g, 
                    b 
                ];
            },
            getBoundingBox: function(el){
                let rect = el.getBoundingClientRect();
                return { top: rect.top + (window.pageYOffset || document.documentElement.scrollTop), left: rect.left + (window.pageXOffset || document.documentElement.scrollLeft), width: rect.width, height: rect.height  };
            },
            degreesToRadians: function(degrees) {
                return degrees * (Math.PI / 180);
            },
            countDecimals: function (value) {
                if(Math.floor(value.valueOf()) === value.valueOf()) return 0;
                return value.toString().split(".")[1].length || 0; 
            },
            round: function(value, places) {
                let res = Number(Math.round(value + 'e' + places) + 'e-' + places);
                return !isNaN(res) ? res : 0;
            }
        },
        eventListeners = {
            open: [],
            change: [],
            close: []
        };

    // public variables
    this.root;
    this.container = config.container;
    this.debug = config.debug; // debug mode flag

    // properties
    let _color = new HSVaColor().fromRGBa(config.color.r, config.color.g, config.color.b);
    Object.defineProperty(self, 'color', {
        // getter function
        get: function() { 
            return _color; 
        },
        //setter function
        set: function(c){
            // if new color is HSVaColor type
            if(c instanceof HSVaColor){
                // set new color value
                _color = c;
                // trigger value changed event
                emit('change', self.value);
            }
        },
        enumerable: true,
        configurable: true
    });

    /**
     * Event emmiter function
     * @param {String} event  
     *  Event name
     * @param {Any} args  
     *  Event data
     */
    let emit = function(event, ...args) {
        eventListeners[event].forEach(cb => cb(...args, self));
    }

    /**
     * Event sundcribetion function
     * @param {String} event  
     *  Event name
     * @param {Function} fn  
     *  Event function
     */
    this.on = function(event, fn) {
        eventListeners[event] = eventListeners[event] || [];
        eventListeners[event].push(fn);
        return this;
    }

    /**
     * Event unsundcribetion function
     * @param {String} event  
     *  Event name
     * @param {Function} fn  
     *  Event function
     */
    this.off = function(event, fn) {
        const functions = (eventListeners[event] || []);
        const index = functions.indexOf(fn);
        if (~index)
            functions.splice(index, 1);
        return this;
    }

    /**
     * Color picker control initialization function.
     * Creates color picker element, add it to the document body or specified container and binds events to ui.
     **/
    let init = function () {
        // creating root element
        let root = document.createElement('div');
        root.innerHTML = `
            <div class="color-picker">
        
            <div class="color-picker-controls">
                <div class="color-picker-controls-group" style="display: flex; flex-direction: row;height: 160px;">
        
                    <div class="color-picker-wheel-control">
                        <canvas id="wheel-canvas" class="wheel-canvas"></canvas>
                        <div class="color-picker-wheel-control-thumb" style="top:50%; left: 50%;"></div>
                    </div>
        
                    <div class="color-picker-brightness-control">
                        <canvas id="brightness-canvas" class="brightness-canvas"></canvas>
                        <div class="color-picker-brightness-control-thumb" style="bottom: 0; left: 50%;"></div>
                    </div>
        
                </div>
                <div class="color-picker-controls-group" style="flex: 1; padding-top: 0;">

                    <div class="color-picker-input-controls">
                        <div class="color-picker-input-controls-tab-headers">
                            <button data-tab="rgb">RGB</button>
                            <button data-tab="hsv" class="selected">HSV</button>
                            <button data-tab="hex">HEX</button>
                        </div>
                        <div class="color-picker-input-controls-tabs">

                            <div class="color-picker-input-controls-tab" data-tab="rgb">
                                <div class="color-picker-red-input range-input-control" data-value="0" data-step="0.01" data-min="0" data-max="255">
                                    <div class="range-input-enter-block">
                                        <input class="range-input" type="number">
                                    </div>
                                    <div class="range-input-details-block">
                                        <span class="range-input-progress"></span>
                                        <span class="range-input-label">R:</span>
                                        <span class="range-input-value">0.00</span>
                                    </div>
                                </div>
                                <div class="color-picker-green-input range-input-control" data-value="0" data-step="0.01" data-min="0" data-max="255">
                                    <div class="range-input-enter-block">
                                        <input class="range-input" type="number">
                                    </div>
                                    <div class="range-input-details-block">
                                        <span class="range-input-progress"></span>
                                        <span class="range-input-label">G:</span>
                                        <span class="range-input-value">0.00</span>
                                    </div>
                                </div>
                                <div class="color-picker-blue-input range-input-control" data-value="0" data-step="0.01" data-min="0" data-max="255">
                                    <div class="range-input-enter-block">
                                        <input class="range-input" type="number">
                                    </div>
                                    <div class="range-input-details-block">
                                        <span class="range-input-progress"></span>
                                        <span class="range-input-label">B:</span>
                                        <span class="range-input-value">0.00</span>
                                    </div>
                                </div>
                            </div>

                            <div class="color-picker-input-controls-tab selected" data-tab="hsv">
                                <div class="color-picker-hue-input range-input-control" data-value="0" data-step="0.01" data-min="0" data-max="360">
                                    <div class="range-input-enter-block">
                                        <input class="range-input" type="number">
                                    </div>
                                    <div class="range-input-details-block">
                                        <span class="range-input-progress"></span>
                                        <span class="range-input-label">H:</span>
                                        <span class="range-input-value">0.00</span>
                                    </div>
                                </div>
                                <div class="color-picker-saturation-input range-input-control" data-value="0" data-step="0.01" data-min="0" data-max="100">
                                    <div class="range-input-enter-block">
                                        <input class="range-input" type="number">
                                    </div>
                                    <div class="range-input-details-block">
                                        <span class="range-input-progress"></span>
                                        <span class="range-input-label">S:</span>
                                        <span class="range-input-value">0.00</span>
                                    </div>
                                </div>
                                <div class="color-picker-brightness-input range-input-control" data-value="0" data-step="0.01" data-min="0" data-max="100">
                                    <div class="range-input-enter-block">
                                        <input class="range-input" type="number">
                                    </div>
                                    <div class="range-input-details-block">
                                        <span class="range-input-progress"></span>
                                        <span class="range-input-label">V:</span>
                                        <span class="range-input-value">0.00</span>
                                    </div>
                                </div>
                            </div>

                            <div class="color-picker-input-controls-tab" data-tab="hex">
                                <div class="color-picker-hex-input text-input-control" data-value="000000" data-is-alphanumeric="true">
                                    <div class="text-input-enter-block">
                                        <input class="text-input" type="text">
                                    </div>
                                    <div class="text-input-details-block">
                                        <span class="text-input-label">Hex:</span>
                                        <span class="text-input-value">000000</span>
                                    </div>
                                </div>
                            </div>` + 
                            ((config.use_alpha) ?
                                `<div class="color-picker-alpha-input range-input-control" data-value="255" data-step="0.01" data-min="0" data-max="255">
                                    <div class="range-input-enter-block">
                                        <input class="range-input" type="number">
                                    </div>
                                    <div class="range-input-details-block">
                                        <span class="range-input-progress"></span>
                                        <span class="range-input-label">A:</span>
                                        <span class="range-input-value">0.00</span>
                                    </div>
                                </div>` : ``)
                        + `</div>
                    </div>
        
                </div>
            </div>
        
        </div>
        `.trim();
        self.root = root.firstElementChild;
        self.root.dataset.theme = config.theme;
        self.container.appendChild(self.root);
        // initialize control to manipulate hue and saturation values
        color_wheel = new WheelControl(); 
        // initialize control to manipulate brightness value
        brightness_slider = new BrightnessControl();
        // getting tab selection buttons
        tab_selection_buttons = self.root.querySelectorAll('.color-picker-input-controls-tab-headers button');
        // initialize control to manipulate rgb channels of color
        red_input = new RangeInputControl(self.root.querySelector('.color-picker-red-input'));
        green_input = new RangeInputControl(self.root.querySelector('.color-picker-green-input'));
        blue_input = new RangeInputControl(self.root.querySelector('.color-picker-blue-input'));
        // initialize control to manipulate hsv channels of color
        hue_input = new RangeInputControl(self.root.querySelector('.color-picker-hue-input'));
        saturation_input = new RangeInputControl(self.root.querySelector('.color-picker-saturation-input'));
        brightness_input = new RangeInputControl(self.root.querySelector('.color-picker-brightness-input'));
        // initialize control to manipulate hex value of color
        hex_input = new TextInputControl(self.root.querySelector('.color-picker-hex-input'));
        // initialize control to manipulate alpha channel of color
        if(config.use_alpha)
            alpha_input = new RangeInputControl(self.root.querySelector('.color-picker-alpha-input'));
        // binding events to ui
        bindEvents();
        // refreshing control
        self.update();
        // emmit open event
        emit('open');
    };

    /**
     * Binding events function.
     * Binds events to color picker controls.
     **/
    let bindEvents = function () {  
        // creating click event handler for tab switching buttons
        tab_selection_handler = function(e){
            // removing 'active' class from all tab switching buttons and tabs
            tab_selection_buttons.forEach(e=>e.classList.remove('selected'));
            self.root.querySelectorAll('.color-picker-input-controls-tab').forEach(e=>e.classList.remove('selected'));
            // adding 'active' class to target button and tab
            e.target.classList.add("selected");
            self.root.querySelector('.color-picker-input-controls-tab[data-tab="' + e.target.dataset.tab  + '"]').classList.add('selected');
        };
        // adding click event handler to click event listeners of tab switching buttons
        tab_selection_buttons.forEach(button => {
            button.addEventListener('click', tab_selection_handler);
        });

        // creating change event handler for color wheel control  
        color_wheel_change_handler = function(values){
            // setting new hue value
            self.color.h = values.hue;
            // setting new saturation value
            self.color.s = values.saturation;
            // updating color picker control
            self.update();
        };
        // adding change event handler to change event listener of color wheel control
        color_wheel.on('change', color_wheel_change_handler);

        // creating change event handler for brightness control  
        brightness_slider_change_handler = function(value){
            // setting new brightness value
            self.color.v = value;
            // updating color picker control
            self.update();
        };
        // adding change event handler to change event listener of brightness control
        brightness_slider.on('change', brightness_slider_change_handler);

        // creating change event handler for hue input control  
        hue_input_change_handler = function(value){
            // setting new hue value
            self.color.h = value;
            // updating color picker control
            self.update();
        };
        // adding change event handler to change event listener of hue input control
        hue_input.on('change', hue_input_change_handler);
        // creating change event handler for saturation input control  
        saturation_input_change_handler = function(value){
            // setting new saturation value
            self.color.s = value;
            // updating color picker control
            self.update();
        };
        // adding change event handler to change event listener of saturation input control
        saturation_input.on('change', saturation_input_change_handler);
        // creating change event handler for brightness input control  
        brightness_input_change_handler = function(value){
            // setting new brightness value
            self.color.v = value;
            // updating color picker control
            self.update();
        };
        // adding change event handler to change event listener of brightness input control
        brightness_input.on('change', brightness_input_change_handler);
    
        // creating change event handler for red input control     
        red_input_change_handler = function(value){
            // getting convert rgb color data to hsv
            let hsv = utils.rgbToHsv(red_input.value, green_input.value, blue_input.value);
            // setting new hue value
            self.color.h = hsv[0];
            // setting new saturation value
            self.color.s = hsv[1];
            // setting new brightness value
            self.color.v = hsv[2];
            // updating color picker control
            self.update();
        };
        // adding change event handler to change event listener of red input control
        red_input.on('change', red_input_change_handler);
        // creating change event handler for green input control 
        green_input_change_handler = function(value){
            // getting convert rgb color data to hsv
            let hsv = utils.rgbToHsv(red_input.value, green_input.value, blue_input.value);
            // setting new hue value
            self.color.h = hsv[0];
            // setting new saturation value
            self.color.s = hsv[1];
            // setting new brightness value
            self.color.v = hsv[2];
            // updating color picker control
            self.update();
        };
        // adding change event handler to change event listener of green input control
        green_input.on('change', green_input_change_handler);
        // creating change event handler for blue input control 
        blue_input_change_handler = function(value){
            // getting convert rgb color data to hsv
            let hsv = utils.rgbToHsv(red_input.value, green_input.value, blue_input.value);
            // setting new hue value
            self.color.h = hsv[0];
            // setting new saturation value
            self.color.s = hsv[1];
            // setting new brightness value
            self.color.v = hsv[2];
            // updating color picker control
            self.update();
        };
        // adding change event handler to change event listener of blue input control
        blue_input.on('change', blue_input_change_handler);
        
        // creating change event handler for hex input control 
        hex_input_change_handler = function(value){
            let hex = hex_input.value.trim().toLowerCase().replace(/ /g, '').replace(/[^A-Za-z0-9\s]/g,'');
            //..
            let hsv = utils.hexToHsv(hex.padEnd(6, "0"));
            //..
            self.color.h = hsv[0] || 0;
            self.color.s = hsv[1] || 0;
            self.color.v = hsv[2] || 0;
            //..
            self.update();
        };
        // adding change event handler to change event listener of hex input control
        hex_input.on('change', hex_input_change_handler);

        if(config.use_alpha){
            // creating change event handler for alpha input control 
            alpha_input_change_handler = function(value){
                // setting new hue value
                self.color.a = value;
                // updating color picker control
                self.update();
            };
            // adding change event handler to change event listener of alpha input control
            alpha_input.on('change', alpha_input_change_handler);
        }
    }

    /**
     * Unbinding events function.
     * Unbinds events from color picker controls.
     **/
    let unbindEvents = function () {  
        // remove click event listeners from tab switching buttons
        tab_selection_buttons.forEach(b => b.removeEventListener('click', tab_selection_handler));

        // remove change event listener from color wheel control
        color_wheel.off('change', color_wheel_change_handler);

        // remove change event listener from brightness control
        brightness_slider.off('change', brightness_slider_change_handler);

        // remove change event listener from hue input control
        hue_input.off('change', hue_input_change_handler);
        // remove change event listener from saturation input control
        saturation_input.off('change', saturation_input_change_handler);
        // remove change event listener from brightness input control
        brightness_input.off('change', brightness_input_change_handler);

        // remove change event listener from red input control
        red_input.off('change', red_input_change_handler);
        // remove change event listener from green input control
        green_input.off('change', green_input_change_handler);
        // remove change event listener from blue input control
        blue_input.off('change', blue_input_change_handler);

        // remove change event listener from hex input control
        hex_input.off('change', hex_input_change_handler);
    
        // remove change event listener from alpha input control
        if(config.use_alpha)
            alpha_input.off('change', alpha_input_change_handler);
    }

    /**
     * The function of ..
     **/
    this.update = function (trigger_change_event = true) {
        //..
        unbindEvents();
        //..
        let rgb = utils.hsvToRgb(self.color.h, self.color.s, self.color.v);
        //..
        let hex = utils.hsvToHex(self.color.h, self.color.s, self.color.v); 
        //..
        hue_input.value = self.color.h;
        saturation_input.value = self.color.s;
        brightness_input.value = self.color.v;
        //..
        red_input.value = rgb[0];
        green_input.value = rgb[1];
        blue_input.value = rgb[2];
        //..
        hex_input.value = hex.join('').toUpperCase();
        //..
        color_wheel.values.hue = self.color.h;
        color_wheel.values.saturation = self.color.s;
        brightness_slider.value = self.color.v;
        //..
        if(config.use_alpha)
            alpha_input.value = self.color.a;
        //..
        bindEvents();
        //..
        if(trigger_change_event)
            emit('change', this.color);       
    };

    /**
     * Destroying control function.
     * Unbinds control events and dispose control data.
     **/
    this.dispose = function () {
        // unbind events 
        unbindEvents();
        // dispose properties
        this.color.dispose();
        this.color = null;
        this.debug = null;
        this.root.parentNode.removeChild(this.root);
        this.root = null;
        // dispose handlers
        tab_selection_handler = null;
        color_wheel_change_handler = null;
        brightness_slider_change_handler = null;
        hue_input_change_handler = null;
        saturation_input_change_handler = null;
        brightness_input_change_handler = null;
        red_input_change_handler = null;
        green_input_change_handler = null;
        blue_input_change_handler = null;
        alpha_input_change_handler = null;
        hex_input_change_handler = null;
        // dispose variables   
        config = null;
        color_picker_control = null;
        self = null;
        utils = null;
        eventListeners.open.splice(0, eventListeners.open.length);
        eventListeners.open = null;
        eventListeners.change.splice(0, eventListeners.change.length);
        eventListeners.change = null;
        eventListeners.close.splice(0, eventListeners.close.length);
        eventListeners.close = null;
        eventListeners = null;
        //dispose controls
        color_wheel.dispose();
        color_wheel = null;
        brightness_slider.dispose();
        brightness_slider = null;
        tab_selection_buttons = null;
        red_input.dispose();
        red_input = null;
        green_input.dispose();
        green_input = null;
        blue_input.dispose();
        blue_input = null;
        hue_input.dispose();
        hue_input = null;
        saturation_input.dispose();
        saturation_input = null;
        brightness_input.dispose();
        brightness_input = null;
        hex_input.dispose();
        hex_input = null;
        if(config.use_alpha)
            alpha_input.dispose();
        alpha_input = null;
        // dispose functions
        emit = null;
        init = null;
        bindEvents = null;
        unbindEvents = null;
        // dispose all object members
        for (var member in this) delete this[member];
    };


    /**
     * HSVa color representation model.
     * @param {Number} hue
     *  The hue in the set [0, 360]
     * @param {Number} saturation
     *  The saturation in the set [0, 100]
     * @param {Number} brightness
     *  The brightness in the set [0, 100]
     * @param {Number} alpha
     *  The alpha in the set [0, 255]
     */
    function HSVaColor(h = 360, s = 0, v = 100, a = 255) {
        this.h = h;
        this.s = s;
        this.v = v;
        this.a = a;

        Object.assign(HSVaColor.prototype, {
            fromHSVa( h = 0, s = 0, v = 0, a = 255) {
                this.h = h;
                this.s = s;
                this.v = v;
                this.a = a;
                return this;
            },
            toHSVa() {
                let mapper = (original, next) => (precision = -1) => {
                    return next(~precision ? original.map(v => Number(v.toFixed(precision))) : original);
                };
                let hsva = [this.h, this.s, this.v, this.a];
                hsva.toString = mapper(hsva, arr => `hsva(${arr[0]}, ${arr[1]}%, ${arr[2]}%, ${this.a})`);
                return hsva;
            },
            fromHSLa(h, s, l, a = 255) {
                let hsv = utils.hslToHsv(h, s, l);

                if(hsv != null){
                    this.h = hsv[0] || 0;
                    this.s = hsv[1] || 0;
                    this.v = hsv[2] || 0;
                    this.a = a;
                }
                else{
                    console.error('Error while parsing hsl into hsv');
                }
                return this;
            },
            toHSLa() {
                let mapper = (original, next) => (precision = -1) => {
                    return next(~precision ? original.map(v => Number(v.toFixed(precision))) : original);
                };
                let hsla = [...utils.hsvToHsl(this.h, this.s, this.v), this.a];
                hsla.toString = mapper(hsla, arr => `hsla(${arr[0]}, ${arr[1]}%, ${arr[2]}%, ${this.a})`);
                return hsla;
            },
            fromRGBa(r = 0, g = 0, b = 0, a = 255) {
                //..
                let hsv = utils.rgbToHsv(r, g, b);

                if(hsv != null){
                    this.h = hsv[0] || 0;
                    this.s = hsv[1] || 0;
                    this.v = hsv[2] || 0;
                    this.a = a;
                }
                else{
                    console.error('Error while parsing rgb into hsv');
                }
                return this;
            },
            toRGBa() {
                let mapper = (original, next) => (precision = -1) => {
                    return next(~precision ? original.map(v => Number(v.toFixed(precision))) : original);
                };
                let rgba = [...utils.hsvToRgb(this.h, this.s, this.v), this.a];
                rgba.toString = mapper(rgba, arr => `rgba(${arr[0]}, ${arr[1]}, ${arr[2]}, ${this.a})`);
                return rgba;
            },
            fromHEX(hex, a = 255) {
                hex = hex.trim().toLowerCase().replace(/ /g, '').replace(/[^A-Za-z0-9\s]/g,'');
                //..
                let hsv = utils.hexToHsv(hex.padEnd(6, "0"));
                if(hsv != null){
                    this.h = hsv[0] || 0;
                    this.s = hsv[1] || 0;
                    this.v = hsv[2] || 0;
                    this.a = a;
                }
                else{
                    console.error('Error while parsing hex into hsv');
                }
                return this;
            },
            toHEX() {
                let hex = utils.hsvToHex(this.h, this.s, this.v);
                return `#${hex.join('').toUpperCase()}`;
            }
        });

        /**
         * The function of ..
         **/
        this.dispose = function () {
            // dispose all object members
            for (var member in this) delete this[member];
        };
    }
    
    /**
     * ..
     */
    function WheelControl() {
        // private values ​​of the wheel control
        let container = color_picker_control.root.querySelector('.color-picker-wheel-control'),
            canvas = container.querySelector('canvas'),
            thumb = container.querySelector('.color-picker-wheel-control-thumb'),
            is_mouse_down = false,
            thumb_mousedown_handler,
            canvas_mousedown_handler,
            document_mousemove_handler,
            document_mouseup_handler,
            self = this,
            color_wheel,
            eventListeners = {
                change: []
            };


        // public values ​​of the wheel control
        this.values = {};

        // hue value property
        let _hue = color_picker_control.color.h;
        Object.defineProperty(this.values, 'hue', {
            // getter function
            get: function() { 
                return _hue; 
            },
            //setter function
            set: function(v){
                // if the set value is greater than the maximum value, then set the maximum value
                if(v > 360)
                    v = 360;
                // if the set value is less than the maximum value, then set the minimum value
                if(v < 0)
                    v = 0;
                //..
                _hue = v;
                //..
                self.update();
                // trigger value changed event
                emit('change', self.values);
            },
            enumerable: true,
            configurable: true
        });

        // saturation value property
        let _saturation = color_picker_control.color.s;
        Object.defineProperty(this.values, 'saturation', {
            // getter function
            get: function() { 
                return _saturation; 
            },
            //setter function
            set: function(v){
                // if the set value is greater than the maximum value, then set the maximum value
                if(v > 100)
                    v = 100;
                // if the set value is less than the maximum value, then set the minimum value
                if(v < 0)
                    v = 0;
                //..
                _saturation = v;
                //..
                self.update();
                // trigger value changed event
                emit('change', self.values);
            },
            enumerable: true,
            configurable: true
        });
    
        /**
         * Event emmiter function
         * @param {String} event  
         *  Event name
         * @param {Any} args  
         *  Event data
         */
        let emit = function(event, ...args) {
            eventListeners[event].forEach(cb => cb(...args, self));
        }
    
        /**
         * Event sundcribetion function
         * @param {String} event  
         *  Event name
         * @param {Function} fn  
         *  Event function
         */
        this.on = function(event, fn) {
            eventListeners[event].push(fn);
            return this;
        }
    
        /**
         * Event unsundcribetion function
         * @param {String} event  
         *  Event name
         * @param {Function} fn  
         *  Event function
         */
        this.off = function(event, fn) {
            const functions = (eventListeners[event] || []);
            const index = functions.indexOf(fn);
            if (~index)
                functions.splice(index, 1);
            return this;
        }


        /**
         * Wheel control initialization function.
         * Initializing a color wheel gradient, draw control's canvas with color wheel gradient, updates thumb element and bind events to ui.
        **/
        let init = function () {
            // color wheel initialization
            initColorWheel(()=>{
                // draw control's canvas
                drawCanvas();
                // update thumb element
                updateThumb();
                // bind events to ui
                bindEvents();
                // draw control's helpers
                if(color_picker_control.debug)
                    drawHelpers();
            });     
        };

        /**
         * Function to initialize a color wheel gradient.
         * Creating a color wheel image for later use on the control's canvas.
        **/
        let initColorWheel = function (callback) {
            // create temporary canvas element
            let can = document.createElement("canvas");
            // set canvas size
            can.height = can.width = 512;
            // get canvas context
            let ctx = can.getContext("2d");
            // calculate canvas radius
            let radius = can.width / 2;
            // set loop step
            let step = 1 / radius;
            // clear canvas
            ctx.clearRect(0, 0, can.width, can.height);
            // set center points
            let cx = radius;
            let cy = radius;
            // loop around circle
            for(let i = 0; i < 360; i += step) {
                // get angle in radians
                let rad = i * (2 * Math.PI) / 360;
                // get line direction from center
                let x = radius * Math.cos(rad),
                    y = radius * Math.sin(rad);
                // set stroke style
                ctx.strokeStyle = 'hsl(' + i + ', 100%, 50%)';
                // draw color line
                ctx.beginPath();
                ctx.moveTo(radius, radius);
                ctx.lineTo(cx + x, cy + y);
                ctx.stroke();
            }

            // draw saturation gradient
            let grd = ctx.createRadialGradient(cx,cy,0,cx,cx,radius);
            grd.addColorStop(0,'rgba(255, 255, 255, 1)');
            grd.addColorStop(1,'rgba(255, 255, 255, 0)');
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.fill();
            // draw circle border
            ctx.beginPath();
            ctx.strokeStyle = "rgb(38, 41, 50)";
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.stroke();
            // create image and load canvas result into it
            color_wheel = new Image();
            color_wheel.onload = function() {
                callback();
            }
            color_wheel.src = can.toDataURL();
        };

        /**
         * The function of drawing control's canvas with color wheel gradient and applying brightness filter
        **/
        let drawCanvas = function () {
            // get the size of the canvas and its position relative to the document
            let canvas_bb = utils.getBoundingBox(canvas);
            // update canvas size based received values
            canvas.width = canvas.height = canvas_bb.width;
            // get canvas context
            let ctx = canvas.getContext("2d");
            // rotate canvas context to 90 degrees
            ctx.translate(canvas.width/2, canvas.height/2);
            ctx.rotate(90 * Math.PI / 180);
            ctx.translate(-canvas.width/2, -canvas.height/2);
            

            
                //ctx.imageSmoothingEnabled = true;
                
                
                
                ctx.beginPath();
                ctx.arc(canvas.width/2, canvas.width/2, canvas.width/2, 0, Math.PI*2);
                ctx.clip();
                ctx.closePath();
                // drawing multiple times on this clipped area will increase artifacts

            // creating opacity pattern
            let opacityPattern = document.createElement("canvas");
                // set cell size to 10 pixels
                let cell_size = 10;
                // set the size of the opacity pattern to two cells in height and in width
                opacityPattern.width = cell_size * 2;
                opacityPattern.height = cell_size * 2;
                // get opacity pattern context
                var opacityPatternContext = opacityPattern.getContext("2d");
                // set cells colors
                let cell_1_color = 'rgba(255, 255, 255, 1)', cell_2_color = 'rgba(205, 205,205, 1)';
                // draw first cell
                opacityPatternContext.beginPath();
                opacityPatternContext.fillStyle = cell_1_color;
                opacityPatternContext.fillRect(0, 0, cell_size, cell_size);
                opacityPatternContext.closePath();
                // draw second cell
                opacityPatternContext.beginPath();
                opacityPatternContext.fillStyle = cell_2_color;
                opacityPatternContext.fillRect(cell_size, 0, cell_size, cell_size);
                opacityPatternContext.closePath();
                // draw third cell
                opacityPatternContext.beginPath();
                opacityPatternContext.fillStyle = cell_2_color;
                opacityPatternContext.fillRect(0, cell_size, cell_size, cell_size);
                opacityPatternContext.closePath();
                // draw fourth cell
                opacityPatternContext.beginPath();
                opacityPatternContext.fillStyle = cell_1_color;
                opacityPatternContext.fillRect(cell_size, cell_size, cell_size, cell_size);
                opacityPatternContext.closePath();
            
                // add opacity pattern on the canvas
                var opacity_pattern = ctx.createPattern(opacityPattern, "repeat");

                // draw an opacity pattern on the canvas
                ctx.beginPath();
                ctx.fillStyle = opacity_pattern;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.closePath();


                // applying brightness filter to canvas context
                ctx.filter = 'brightness(' + color_picker_control.color.v + '%)';
                

                //..
                ctx.beginPath();
                //ctx.strokeStyle = "rgb(38, 41, 50)";
                ctx.strokeStyle = "rgb(217, 214, 205)";
                ctx.arc(canvas.width/2, canvas.width/2, canvas.width/2, 0, Math.PI*2);
                ctx.stroke();
                ctx.closePath();
                   
                
                //..
                ctx.globalAlpha = color_picker_control.color.a / 255;
                // draw color wheel gradient to canvas context
                ctx.drawImage(color_wheel, 0, 0, canvas.width, canvas.height);
        };

        /**
         * The function of updating thumb element styles.
         * Positioning and change background color based on hue and saturation values.
        **/
        let updateThumb = function () {
            // get the sizes of the canvas and thumb elements and the position of these elements relative to the document
            let canvas_bb = utils.getBoundingBox(canvas);
            let thumb_bb = utils.getBoundingBox(thumb);
            
            // get main color data as rgb
            var main_color = utils.hsvToRgb(color_picker_control.color.h, color_picker_control.color.s, color_picker_control.color.v);

            // update thumb background color 
            thumb.style.backgroundColor = "rgb(" + main_color[0] + "," + main_color[1] + "," + main_color[2] + ")";
            
            // update thumb position based on hue and saturation values (if it changed ouside)  
            if(!is_mouse_down){
                thumb.style.left = (canvas_bb.width / 2) + ((canvas_bb.width / 2)/100*color_picker_control.color.s) * Math.cos(utils.degreesToRadians(color_picker_control.color.h + 90)) - (thumb_bb.width / 2) + 'px';
                thumb.style.top = (canvas_bb.height / 2) + ((canvas_bb.width / 2)/100*color_picker_control.color.s)  * Math.sin(utils.degreesToRadians(color_picker_control.color.h + 90)) - (thumb_bb.height / 2) + 'px';
            }
            
            // update thumb dataset hue and saturation values
            thumb.dataset.value1 = color_picker_control.color.h;
            thumb.dataset.value2 = color_picker_control.color.s;
        };

        /**
         * The function of binding events to ui
        **/
        let bindEvents = function () {
            // initialize thumb element mousedown/touchstart handler
            thumb_mousedown_handler = function(e){
                // remove document selection before thumb moving
                if (document.selection) {
                    document.selection.empty()
                } else {
                    window.getSelection().removeAllRanges()
                }

                // set is_mouse_down flag to true
                is_mouse_down = true;
            };
            // add mousedown/touchstart event listeners to thumb element
            thumb.addEventListener('mousedown', thumb_mousedown_handler, true);
            thumb.addEventListener('touchstart', thumb_mousedown_handler, true);

            // initialize canvas element mousedown/touchstart handler
            canvas_mousedown_handler = function(e){
                // remove document selection before thumb moving
                if (document.selection) {
                    document.selection.empty()
                } else {
                    window.getSelection().removeAllRanges()
                }

                // set is_mouse_down flag to true
                is_mouse_down = true;

                // get horizontal and vertical mouse points, relative to the document
                let pageX = e.touches ? e.touches[0].pageX : e.pageX;
                let pageY = e.touches ? e.touches[0].pageY : e.pageY;

                // get the sizes of the canvas and thumb elements and the position of these elements relative to the document
                let canvas_bb = utils.getBoundingBox(canvas);
                let thumb_bb = utils.getBoundingBox(thumb);

                // get canvas radius and prepare values to calculation of hue and saturation based on thumb position
                let r = canvas_bb.width / 2,
                    x1 = pageX,
                    y1 = pageY,
                    x2 = (canvas_bb.left + canvas_bb.width / 2),
                    y2 = (canvas_bb.top + canvas_bb.height / 2);
            
                // calculate angle of vector from control center to thumb element
                let angle = Math.atan2(y1 - y2, x1 - x2) * 360 / (2 * Math.PI) - 90;
                if(angle < 0) angle += 360;

                // check if thumb element position outside the color wheel
                if(Math.sqrt((x1-x2)*(x1-x2) + (y1-y2)*(y1-y2)) > r){
                    // set thumb element position on circle border by angle and radius
                    thumb.style.left = (canvas_bb.width / 2) + r * Math.cos(utils.degreesToRadians(angle + 90)) - (thumb_bb.width / 2) + 'px';
                    thumb.style.top = (canvas_bb.height / 2) + r * Math.sin(utils.degreesToRadians(angle + 90)) - (thumb_bb.height / 2) + 'px';
                }
                else{ // set thumb position by mouse position
                    thumb.style.left = ((pageX - canvas_bb.left) - thumb_bb.width / 2) + 'px';
                    thumb.style.top = ((pageY - canvas_bb.top) - thumb_bb.height / 2) + 'px';
                }

                // get the sizes of the canvas and thumb elements and the position of these elements relative to the document
                canvas_bb = utils.getBoundingBox(canvas);
                thumb_bb = utils.getBoundingBox(thumb);

                // calculate length of vector from control center to thumb element
                let dx = ((canvas_bb.left + canvas_bb.width / 2) - (thumb_bb.left + thumb_bb.width / 2)), 
                    dy = ((canvas_bb.top + canvas_bb.height / 2) - (thumb_bb.top + thumb_bb.height / 2)), 
                    scale_length = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));

                // calculate hue and saturation values based on thumb position
                let hue = angle;
                let saturation = Math.min(100, Math.ceil(scale_length / r * 100));

                // update control hue and saturation values
                self.values.hue = hue;
                self.values.saturation = saturation;

                // update thumb dataset hue and saturation values
                thumb.dataset.value1 = hue;
                thumb.dataset.value2 = saturation;

                // emmit change event
                emit('change', self.values);
            };
            // add mousedown/touchstart event listeners to canvas element
            canvas.addEventListener('mousedown', canvas_mousedown_handler, true);
            canvas.addEventListener('touchstart', canvas_mousedown_handler, true);

            // initialize document mousemove/touchmove handler
            document_mousemove_handler = function(e){
                // check if is_mouse_down flag has true value
                if (is_mouse_down) {
                    // prevent scroll
                    e.preventDefault();
                    e.stopImmediatePropagation();

                    // get horizontal and vertical mouse points, relative to the document
                    let pageX = e.touches ? e.touches[0].pageX : e.pageX;
                    let pageY = e.touches ? e.touches[0].pageY : e.pageY;

                    // get the sizes of the canvas and thumb elements and the position of these elements relative to the document
                    let canvas_bb = utils.getBoundingBox(canvas);
                    let thumb_bb = utils.getBoundingBox(thumb);

                    // get canvas radius and prepare values to calculation of hue and saturation based on thumb position
                    let r = canvas_bb.width / 2,
                        x1 = pageX,
                        y1 = pageY,
                        x2 = (canvas_bb.left + canvas_bb.width / 2),
                        y2 = (canvas_bb.top + canvas_bb.height / 2);
                
                    // calculate angle of vector from control center to thumb element
                    let angle = Math.atan2(y1 - y2, x1 - x2) * 360 / (2 * Math.PI) - 90;
                    if(angle < 0) angle += 360;

                    // check if thumb element position outside the color wheel
                    if(Math.sqrt((x1-x2)*(x1-x2) + (y1-y2)*(y1-y2)) > r){
                        // set thumb element position on circle border by angle and radius
                        thumb.style.left = (canvas_bb.width / 2) + r * Math.cos(utils.degreesToRadians(angle + 90)) - (thumb_bb.width / 2) + 'px';
                        thumb.style.top = (canvas_bb.height / 2) + r * Math.sin(utils.degreesToRadians(angle + 90)) - (thumb_bb.height / 2) + 'px';
                    }
                    else{ // set thumb position by mouse position
                        thumb.style.left = ((pageX - canvas_bb.left) - thumb_bb.width / 2) + 'px';
                        thumb.style.top = ((pageY - canvas_bb.top) - thumb_bb.height / 2) + 'px';
                    }

                    // get the sizes of the canvas and thumb elements and the position of these elements relative to the document
                    canvas_bb = utils.getBoundingBox(canvas);
                    thumb_bb = utils.getBoundingBox(thumb);

                    // calculate length of vector from control center to thumb element
                    let dx = ((canvas_bb.left + canvas_bb.width / 2) - (thumb_bb.left + thumb_bb.width / 2)), 
                        dy = ((canvas_bb.top + canvas_bb.height / 2) - (thumb_bb.top + thumb_bb.height / 2)), 
                        scale_length = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));

                    // calculate hue and saturation values based on thumb position
                    let hue = angle;
                    let saturation = Math.min(100, Math.ceil(scale_length / r * 100));

                    // update control hue and saturation values
                    self.values.hue = hue;
                    self.values.saturation = saturation;

                    // update thumb dataset hue and saturation values
                    thumb.dataset.value1 = hue;
                    thumb.dataset.value2 = saturation;

                    // emmit change event
                    emit('change', self.values);
                }
            };
            // add mousemove/touchmove event listeners to document
            document.addEventListener('mousemove', document_mousemove_handler, true);
            document.addEventListener('touchmove', document_mousemove_handler, { passive: false });

            // initialize document mouseup/touchend handler
            document_mouseup_handler = function(e){
                // set is_mouse_down flag to false
                is_mouse_down = false;
            };
            // add mouseup/touchend event listeners to document
            document.addEventListener('mouseup', document_mouseup_handler, true);
            document.addEventListener('touchend', document_mouseup_handler, true);
        }

        /**
         * The function of binding events from ui
        **/
        let unbindEvents = function () {
            // remove event listeners attached to thumb element
            thumb.removeEventListener('mousedown', thumb_mousedown_handler, false);
            thumb.removeEventListener('touchstart', thumb_mousedown_handler, false);
            // remove event listeners attached to canvas element
            canvas.removeEventListener('mousedown', canvas_mousedown_handler, false);
            canvas.removeEventListener('touchstart', canvas_mousedown_handler, false);
            // remove event listeners attached to document
            document.removeEventListener('mousemove', document_mousemove_handler, false);
            document.removeEventListener('touchmove', document_mousemove_handler, false);
            document.removeEventListener('mouseup', document_mouseup_handler, false);
            document.removeEventListener('touchend', document_mouseup_handler, false);
        };

        /**
         * The function of drawing control's helpers
        **/
        let drawHelpers = function() {
            // get the sizes of the canvas and thumb elements and the position of these elements relative to the document
            let canvas_bb = utils.getBoundingBox(canvas);
            let thumb_bb = utils.getBoundingBox(thumb);
            
            // get canvas context
            var ctx = canvas.getContext("2d");

            //..
            ctx.globalAlpha = 1;

            // get canvas radius and prepare values to calculation of hue and saturation based on thumb position
            let r = canvas_bb.width / 2,
                x1 = (thumb_bb.left + thumb_bb.width / 2),
                y1 = (thumb_bb.top + thumb_bb.height / 2),
                x2 = (canvas_bb.left + canvas_bb.width / 2),
                y2 = (canvas_bb.top + canvas_bb.height / 2);

            // calculate angle of vector from control center to thumb element
            let scale_angle = Math.atan2(y1 - y2, x1 - x2) * 360 / (2 * Math.PI) - 90;
            if(scale_angle < 0) scale_angle += 360;

            // calculate saturation scale length and roatation angle in radians
            let dx = ((canvas_bb.left + canvas_bb.width / 2) - (thumb_bb.left + thumb_bb.width / 2)),
                dy = ((canvas_bb.top + canvas_bb.height / 2) - (thumb_bb.top + thumb_bb.height / 2)), 
                scale_length = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));

            // if saturation scale length more than 0
            if(scale_length > 0)
            {       
                //#region draw saturation scale helper
                    // draw a vector to the center of the wheel
                    ctx.beginPath();
                    ctx.setLineDash([3, 3]);          
                    ctx.moveTo(canvas_bb.width / 2, canvas_bb.height / 2);
                    ctx.lineTo(
                        canvas_bb.width / 2 + Math.cos(utils.degreesToRadians(scale_angle)) * scale_length, 
                        canvas_bb.height / 2 + Math.sin(utils.degreesToRadians(scale_angle)) * scale_length, 
                    );        
                    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
                    ctx.stroke();
                    ctx.closePath();
                //#endregion

                //#region draw hue scale helper
                    // create hue scale angle pattern
                    var stripesPattern = document.createElement("canvas");
                    // set stripes pattern size
                    stripesPattern.width = 20;
                    stripesPattern.height = 20;
                    // get stripes pattern context
                    var stripesPatternPattern = stripesPattern.getContext("2d");
                        // draw stripes pattern
                        stripesPatternPattern.beginPath();
                        // set colors of stripes
                        let color1 = "transparent", color2 = 'rgba(0,0,0,0.1)';
                        // set number of stripes
                        let numberOfStripes = 20;
                        // draw stripes
                        for (var i=0; i < numberOfStripes;i++){
                            var thickness = 2;
                            stripesPatternPattern.beginPath();
                            stripesPatternPattern.strokeStyle = i % 2?color1:color2;
                            stripesPatternPattern.lineWidth =thickness;
                            stripesPatternPattern.moveTo(0,i*thickness + thickness/2);
                            stripesPatternPattern.lineTo(100,i*thickness + thickness/2);
                            stripesPatternPattern.stroke();
                        }
                        stripesPatternPattern.closePath();

                    // add stripes pattern on the canvas
                    var stripes_pattern = ctx.createPattern(stripesPattern,"repeat");
            
                    // draw circle in the center of canvas
                    ctx.beginPath();
                    ctx.setLineDash([3, 3]);        
                    ctx.moveTo(canvas_bb.width/2, canvas_bb.height/2);           
                    ctx.arc(canvas_bb.width/2, canvas_bb.height/2, Math.min(r/2, scale_length), 0, utils.degreesToRadians(scale_angle), false);
                    ctx.closePath();
                    ctx.strokeStyle = 'rgba(0,0,0,0.2)';         
                    ctx.fillStyle = stripes_pattern;
                    ctx.fill();
                    ctx.stroke();
                //#endregion

                //#region draw hue and saturation values
                    // rotate canvas context to 90 degrees
                    ctx.translate(canvas.width/2, canvas.height/2);
                    ctx.rotate(-90 * Math.PI / 180);
                    ctx.translate(-canvas.width/2, -canvas.height/2);
                    // draw hue text value
                    ctx.beginPath();
                    ctx.font = "8px serif";
                    ctx.fillStyle = 'rgba(0,0,0,0.8)'; 
                    ctx.fillText("H: " + Math.ceil(Math.min(360, color_picker_control.color.h)), canvas_bb.width / 2 - 8, 16);
                    ctx.closePath();
                    // draw saturation text value
                    ctx.beginPath();
                    ctx.font = "8px serif";
                    ctx.fillStyle = 'rgba(0,0,0,0.8)'; 
                    ctx.fillText("S: " + Math.ceil(Math.min(100, color_picker_control.color.s)), canvas_bb.width / 2 - 8, canvas_bb.height - 20 + 8);
                    ctx.closePath();
                //#endregion
            }      
        }

        /**
         * The function of updating wheel control
        **/
        this.update = function (value) {
            // draw control's canvas
            drawCanvas();
            // update thumb element
            updateThumb();
            // draw control's helpers
            if(color_picker_control.debug)
                drawHelpers();
        };

        /**
         * The function of disposing wheel control
        **/
        this.dispose = function () {
            // unbind events from ui
            unbindEvents();
            // dispose handlers
            thumb_mousedown_handler = null;
            canvas_mousedown_handler = null;
            document_mousemove_handler = null;
            document_mouseup_handler = null;
            // dispose properties
            //this.values = null;
            _hue = null;
            _saturation = null;    
            // dispose variables  
            container = null;
            canvas = null; 
            thumb = null;
            is_mouse_down = null; 
            self = null;
            color_wheel = null;

            init = null;
            initColorWheel = null;
            drawCanvas = null;
            updateThumb = null;
            bindEvents = null;
            unbindEvents = null;
            drawHelpers = null;
            // dispose all control members
            for (var member in this) delete this[member];
        };

        // run initialization of wheel control
        init();
    }
    
    /**
     * ..
     */
    function BrightnessControl() {
        // private values ​​of the hue control
        let container = color_picker_control.root.querySelector('.color-picker-brightness-control'),
            canvas = container.querySelector('canvas'),
            thumb = container.querySelector('.color-picker-brightness-control-thumb'),
            is_mouse_down = false,
            thumb_mousedown_handler,
            canvas_mousedown_handler,
            document_mousemove_handler,
            document_mouseup_handler,
            self = this,
            eventListeners = {
                change: []
            };

        //  value property
        let _value = color_picker_control.color.v;
        Object.defineProperty(self, 'value', {
            // getter function
            get: function() { 
                return _value; 
            },
            //setter function
            set: function(v){
                // if the set value is greater than the maximum value, then set the maximum value
                if(v > 100)
                    v = 100;
                // if the set value is less than the maximum value, then set the minimum value
                if(v < 0)
                    v = 0;
                //..
                _value = v;
                //..
                self.update();
                // trigger value changed event
                emit('change', self.value);
            },
            enumerable: true,
            configurable: true
        });
    
        /**
         * Event emmiter function
         * @param {String} event  
         *  Event name
         * @param {Any} args  
         *  Event data
         */
        let emit = function(event, ...args) {
            eventListeners[event].forEach(cb => cb(...args, self));
        }
    
        /**
         * Event sundcribetion function
         * @param {String} event  
         *  Event name
         * @param {Function} fn  
         *  Event function
         */
        this.on = function(event, fn) {
            eventListeners[event].push(fn);
            return this;
        }
    
        /**
         * Event unsundcribetion function
         * @param {String} event  
         *  Event name
         * @param {Function} fn  
         *  Event function
         */
        this.off = function(event, fn) {
            const functions = (eventListeners[event] || []);
            const index = functions.indexOf(fn);
            if (~index)
                functions.splice(index, 1);
            return this;
        }


        /**
         * Brightness control initialization function.
         * Drawing control's canvas, updates thumb element and bind events to ui.
        **/
        let init = function () {
            // draw canvas
            drawCanvas();
            // update thumb element
            updateThumb();
            // bind events to ui
            bindEvents();
            // draw control's helpers
            if(color_picker_control.debug)
                drawHelpers();
        };

        /**
         * The function of drawing control's canvas with brightness gradient from 100 to 0
        **/
        let drawCanvas = function () {
            // get the size of the canvas and its position relative to the document
            let canvas_bb = utils.getBoundingBox(canvas);
            // update canvas size based received values
            canvas.width = canvas_bb.width;
            canvas.height = canvas_bb.height;
            // create a canvas gradient
            var gradient = canvas.getContext("2d").createLinearGradient(0, 0, 0, canvas.height);
            // get main color data as rgb with brightness equals 100
            var start_color = utils.hsvToRgb(color_picker_control.color.h, color_picker_control.color.s, 100);
            let end_color = [0, 0, 0];
            // add colors to gradient
            gradient.addColorStop(0, "rgb(" + start_color[0] + "," + start_color[1] + "," + start_color[2] + ")");
            gradient.addColorStop(1, "rgb(" + end_color[0] + "," + end_color[1] + "," + end_color[2] + ")");
            // draw gradient on the canvas
            canvas.getContext("2d").fillStyle = gradient;
            canvas.getContext("2d").fillRect(0, 0, canvas.width, canvas.height);
        };

        /**
         * The function of updating thumb element styles.
         * Positioning and change background color based on brightness value.
        **/
        let updateThumb = function () {
            // get the sizes of the canvas and thumb elements and the position of these elements relative to the document
            let canvas_bb = utils.getBoundingBox(canvas);
            let thumb_bb = utils.getBoundingBox(thumb);

            // get main color data as rgb
            var main_color = utils.hsvToRgb(color_picker_control.color.h, color_picker_control.color.s, color_picker_control.color.v);

            // update thumb background color 
            thumb.style.backgroundColor = "rgb(" + main_color[0] + "," + main_color[1] + "," + main_color[2] + ")";
            
            // set thumb horisontal position in the center of the brightness scale  
            thumb.style.left = canvas_bb.width / 2 - thumb_bb.width / 2 + 'px';
            // update thumb position based on hue value (if it changed ouside)  
            if(!is_mouse_down) {
                thumb.style.top = - thumb_bb.height/2 + (canvas_bb.height * ((100 - self.value)/100)) + 'px';
            }

            // update thumb dataset value
            thumb.dataset.value = self.value;
        };

        /**
         * The function of binding events to ui
        **/
        let bindEvents = function () {
            // initialize thumb element mousedown/touchstart handler
            thumb_mousedown_handler = function(e){
                // remove document selection before thumb moving
                if (document.selection) {
                    document.selection.empty()
                } else {
                    window.getSelection().removeAllRanges()
                }
                // set is_mouse_down flag to true
                is_mouse_down = true;    
            };
            // add mousedown/touchstart event listeners to thumb element
            thumb.addEventListener('mousedown', thumb_mousedown_handler, true);
            thumb.addEventListener('touchstart', thumb_mousedown_handler, true);

            // initialize canvas element mousedown/touchstart handler
            canvas_mousedown_handler = function(e){
                // remove document selection before thumb moving
                if (document.selection) {
                    document.selection.empty()
                } else {
                    window.getSelection().removeAllRanges()
                }

                // set is_mouse_down flag to true
                is_mouse_down = true;

                // get vertical mouse point, relative to the document
                let pageY = e.touches ? e.touches[0].pageY : e.pageY;

                // get the sizes of the canvas and thumb elements and the position of these elements relative to the document
                let canvas_bb = utils.getBoundingBox(canvas);
                let thumb_bb = utils.getBoundingBox(thumb);

                // set thumb horisontal position in the center of the brightness scale
                thumb.style.left = canvas_bb.width / 2 - thumb_bb.width / 2 + 'px';

                //..
                if(canvas_bb.top <= (pageY + thumb_bb.height / 2) && (pageY + thumb_bb.height / 2) <= (canvas_bb.top + canvas_bb.height)){
                    thumb.style.top = (pageY - canvas_bb.top) + 'px';
                }
                else{ //..
                    //..
                    if(canvas_bb.top > (pageY + thumb_bb.height / 2))
                        thumb.style.top = (-thumb_bb.height / 2) + 'px';
                    else //..
                        thumb.style.top = (canvas_bb.height - thumb_bb.height / 2) + 'px';
                }

                // get the sizes of the canvas and thumb elements and the position of these elements relative to the document
                canvas_bb = utils.getBoundingBox(canvas);
                thumb_bb = utils.getBoundingBox(thumb);

                // calculate brightness value based on thumb position
                let brightness = 100 - ((thumb_bb.top + thumb_bb.height / 2) - canvas_bb.top) / canvas_bb.height * 100;

                // update control brightness value
                self.value = brightness;
                // update thumb dataset brightness value
                thumb.dataset.value = brightness;

                //emmit change event
                emit('change', self.value);
            };
            canvas.addEventListener('mousedown', canvas_mousedown_handler, true);
            canvas.addEventListener('touchstart', canvas_mousedown_handler, true);

            // initialize document mousemove/touchmove handler
            document_mousemove_handler = function(e){
                // check if is_mouse_down flag has true value
                if (is_mouse_down) {
                    // prevent scroll
                    e.preventDefault();
                    e.stopImmediatePropagation();

                    // get vertical mouse point, relative to the document
                    let pageY = e.touches ? e.touches[0].pageY : e.pageY;

                    // get the sizes of the canvas and thumb elements and the position of these elements relative to the document
                    let canvas_bb = utils.getBoundingBox(canvas);
                    let thumb_bb = utils.getBoundingBox(thumb);

                    //..
                    thumb.style.left = canvas_bb.width / 2 - thumb_bb.width / 2 + 'px';

                    //..
                    if(canvas_bb.top <= (pageY + thumb_bb.height / 2) && (pageY + thumb_bb.height / 2) <= (canvas_bb.top + canvas_bb.height)){
                        thumb.style.top = (pageY - canvas_bb.top) + 'px';
                    }
                    else{ //..
                        //..
                        if(canvas_bb.top > (pageY + thumb_bb.height / 2))
                            thumb.style.top = (-thumb_bb.height / 2) + 'px';
                        else //..
                            thumb.style.top = (canvas_bb.height - thumb_bb.height / 2) + 'px';
                    }

                    // get the sizes of the canvas and thumb elements and the position of these elements relative to the document
                    canvas_bb = utils.getBoundingBox(canvas);
                    thumb_bb = utils.getBoundingBox(thumb);

                    // calculate brightness value based on thumb position
                    let brightness = 100 - ((thumb_bb.top + thumb_bb.height / 2) - canvas_bb.top) / canvas_bb.height * 100;

                    // update control brightness value
                    self.value = brightness;
                    // update thumb dataset brightness value
                    thumb.dataset.value = brightness;

                    //emmit change event
                    emit('change', self.value);
                }
            };
            document.addEventListener('mousemove', document_mousemove_handler, true);
            document.addEventListener('touchmove', document_mousemove_handler, { passive: false });

            // initialize document mouseup/touchend handler
            document_mouseup_handler = function(e){
                // set is_mouse_down flag to false
                is_mouse_down = false;
            };
            document.addEventListener('mouseup', document_mouseup_handler, true);
            document.addEventListener('touchend', document_mouseup_handler, true);
        }

        /**
         * The function of binding events from ui
        **/
        let unbindEvents = function () {
            // remove event listeners attached to thumb element
            thumb.removeEventListener('mousedown', thumb_mousedown_handler, false);
            thumb.removeEventListener('touchstart', thumb_mousedown_handler, false);
            // remove event listeners attached to canvas element
            canvas.removeEventListener('mousedown', canvas_mousedown_handler, false);
            canvas.removeEventListener('touchstart', canvas_mousedown_handler, false);
            // remove event listeners attached to document
            document.removeEventListener('mousemove', document_mousemove_handler, false);
            document.removeEventListener('touchmove', document_mousemove_handler, false);
            document.removeEventListener('mouseup', document_mouseup_handler, false);
            document.removeEventListener('touchend', document_mouseup_handler, false);
        };

        /**
         * The function of drawing control's helpers
        **/
        let drawHelpers = function() {
            // get the sizes of the canvas and thumb elements and the position of these elements relative to the document
            let canvas_bb = utils.getBoundingBox(canvas);
            let thumb_bb = utils.getBoundingBox(thumb);
            
            // calculate brightness scale length
            let scale_length = (canvas_bb.top + canvas_bb.height) - (thumb_bb.top + thumb_bb.height / 2);

            // get canvas context
            var ctx = canvas.getContext("2d");

            // if brightness scale length more than 0
            if(scale_length > 0)
            {       
                //#region draw brightness scale helper
                    // draw a vector to thumb element position
                    ctx.beginPath();
                    ctx.setLineDash([3, 3]);          
                    ctx.moveTo(canvas_bb.width / 2, canvas_bb.height);
                    ctx.lineTo(
                        canvas_bb.width / 2, 
                        canvas_bb.height - scale_length, 
                    );        
                    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
                    ctx.stroke();
                    ctx.closePath();
                //#endregion
            }      
        }

        /**
         * The function of updating brightness control
        **/
        this.update = function (value) {
            // draw control's canvas
            drawCanvas();
            // update thumb element
            updateThumb();
            // draw control's helpers
            if(color_picker_control.debug)
                drawHelpers();
        };

        /**
         * The function of disposing wheel control
        **/
        this.dispose = function () {
            // unbind events from ui
            unbindEvents();
            // dispose handlers
            thumb_mousedown_handler = null;
            canvas_mousedown_handler = null;
            document_mousemove_handler = null;
            document_mouseup_handler = null;
            // dispose properties
            _value = null;
            //this.value = null;
            // dispose variables   
            container = null;  
            canvas = null;
            thumb = null; 
            self = null;
            is_mouse_down = null;

            init = null;
            drawCanvas = null;
            updateThumb = null;
            bindEvents = null;
            unbindEvents = null;
            drawHelpers = null;
            // dispose all control members
            for (var member in this) delete this[member];
        };

        // run initialization of brightness control
        init();
    };
    
    /**
     * ..
     */
    function RangeInputControl(root) {
        // declare properties of the control
        this.root = root;
        this.min = Number(root.dataset.min);
        this.max = Number(root.dataset.max);
        this.step = Number(root.dataset.step) || 1;
    
        // declare private variables
        let self = this,
            range_input = root.querySelector('.range-input'),
            range_progress = root.querySelector('.range-input-progress'),
            range_value = root.querySelector('.range-input-value'),
            folding_screen = document.createElement('div'),
            change_on_key_input = false,
            change_on_mouse_move = false,
            last_mouse_position,
            root_mousedown_handler,
            input_focusout_handler,
            input_keyup_handler,
            eventListeners = {
                focus: [],
                blur: [],
                change: []
            };
        
        // value property
        let _value = Number(root.dataset.value) || 0;
        Object.defineProperty(self, 'value', {
            // getter function
            get: function() { 
                return _value; 
            },
            //setter function
            set: function(v){
                // if the set value is greater than the maximum value, then set the maximum value
                if(self.max != null && v > self.max)
                    v = self.max;
                // if the set value is less  than the maximum value, then set the minimum value
                if(self.min != null && v < self.min)
                    v = self.min;
                // round a value to the specified precision in a step
                _value = utils.round(Number(v), utils.countDecimals(self.step));
                // set value to input
                range_input.value = _value;
                // set value to label
                range_value.innerHTML = _value;
                //..
                if(self.max != null)
                    range_progress.style.width = _value/self.max * 100 + '%';
                // trigger value changed event
                emit('change', self.value);
            },
            enumerable: true,
            configurable: true
        });
    
        // is_focused property
        let _is_focused = false;
        Object.defineProperty(self, 'isFocused', {
            // getter function
            get: function() { 
                return _is_focused; 
            },
            //setter function
            set: function(v){
                // set focused state
                _is_focused = v;
                // trigger focus event
                if(_is_focused){
                    self.root.classList.add('range-input-control--focused');
                    emit('focus', self);
                }
                else{
                    emit('blur', self);
                    self.root.classList.remove('range-input-control--focused');
                }
            },
            enumerable: true,
            configurable: true
        });
    
        /**
        * function for trigger handler event
        **/
        let emit = function(event, ...args) {
            eventListeners[event].forEach(cb => cb(...args, self));
        }
    
        /**
        * function for attaching handler to event
        **/
        this.on = function(event, cb) {
            eventListeners[event].push(cb);
            return this;
        }
    
        /**
        * function for removing handler from event
        **/
        this.off = function(event, cb) {
            const callBacks = (eventListeners[event] || []);
            const index = callBacks.indexOf(cb);
            if (~index) 
                callBacks.splice(index, 1);
            return this;
        }
    
    
        /**
        * function for initialize control
        **/
        let init = function () {
            // set control value
            range_input.value = self.value;
            // set control text value
            range_value.innerHTML = Number(self.value).toFixed(utils.countDecimals(self.step));
            //..
            if(self.max != null)
                range_progress.style.width = self.value/self.max * 100% + '%';
            // add class to folding screen
            folding_screen.classList.add('cursor-folding-screen');
            // bind events to the controls
            bindEvents();
        };
    
        /**
        * function for adding event listeners to controls
        **/
        let bindEvents = function () {    
            //#region add event listeners to value block
                // create handler for value block mousedown event
                root_mousedown_handler = function(e){
                    e.stopPropagation();
    
                    if( self.root.classList.contains('range-input-control--disabled') 
                        || self.root.classList.contains('range-input-control--mouse-move-mode') 
                            || self.root.classList.contains('range-input-control--key-input-mode'))
                                return;
    
                    self.isFocused = true;
    
                    // get horizontal and vertical mouse points, relative to the document
                    let pageX = e.touches ? e.touches[0].pageX : e.pageX;
                    let pageY = e.touches ? e.touches[0].pageY : e.pageY;

                    //..
                    change_on_key_input = true;
                    change_on_mouse_move = true;
                    last_mouse_position = pageX;
                    document.body.appendChild(folding_screen);
                    folding_screen.focus();
    
                    if(!self.root.classList.contains('range-input-control--mouse-move-mode'))
                        self.root.classList.add('range-input-control--mouse-move-mode');

                    //..
                    let root_rect = self.root.getBoundingClientRect();

                    //..
                    let move = function(e){
                        if(!change_on_mouse_move) return;
                        change_on_key_input = false;
                        
                        //..
                        if(e.stopPropagation) e.stopPropagation();
                        if(e.preventDefault) e.preventDefault();

                        // get horizontal and vertical mouse points, relative to the document
                        let pageX = e.touches ? e.touches[0].pageX : e.pageX;
                        let pageY = e.touches ? e.touches[0].pageY : e.pageY;

                        //..
                        let step = ((pageX - last_mouse_position) / root_rect.width) * (self.max - self.min);

                        //..
                        if(pageX == 0)
                            self.value = self.value - self.step;
                        //..
                        else if(pageX == window.screen.width-1)
                            self.value = self.value + self.step;
                        //..
                        else
                            self.value = self.value + step;

                        //..
                        last_mouse_position = pageX;
                    };
                    //..
                    let up = function(e){
                        if(change_on_mouse_move){
                            change_on_mouse_move = false;
                            if(self.root.classList.contains('range-input-control--mouse-move-mode'))
                                self.root.classList.remove('range-input-control--mouse-move-mode');
                            if(folding_screen != null && folding_screen.parentNode != null)
                                document.body.removeChild(folding_screen);        
                        }
      
                        if(change_on_key_input){
                            //..
                            if(!self.root.classList.contains('range-input-control--key-input-mode'))
                                self.root.classList.add('range-input-control--key-input-mode');         
                            //..
                            range_input.focus();
                            range_input.select();
                        }
                        else{
                            self.isFocused = false;
                        }
                        
                        document.removeEventListener('mousemove', move, false);
                        document.removeEventListener('touchmove', move, false);
                    };
                    //..     
                    document.addEventListener('mouseup', up, { once: true });
                    document.addEventListener('touchend', up, { once: true });
                    //..
                    document.addEventListener('mousemove', move, { passive: false });
                    document.addEventListener('touchmove', move, { passive: false }); 
                };
                // attach handler to value block mousedown event
                self.root.addEventListener('mousedown', root_mousedown_handler, true);
                self.root.addEventListener('touchstart', root_mousedown_handler, true);
            //#endregion
    
            //#region add event listeners to value input
                // create handler for value input focusout event
                input_focusout_handler = function(e){
                    //..
                    if(self.root.classList.contains('range-input-control--key-input-mode'))
                        self.root.classList.remove('range-input-control--key-input-mode');
                    this.value = self.value;
                    self.isFocused = false;
                };
                // attach handler to value input focusout event
                range_input.addEventListener("focusout", input_focusout_handler);
    
                // create handler for value input keyup event
                input_keyup_handler = function(e){
                    // 27...Escape
                    if (e.keyCode === 27) {
                        // Cancel the default action, if needed
                        e.preventDefault();
                        //..
                        if(self.root.classList.contains('range-input-control--key-input-mode'))
                            self.root.classList.remove('range-input-control--key-input-mode');
                        this.value = self.value;
                        self.isFocused = false;
                        //....
                    }
                    // Number 13 is the "Enter" key on the keyboard
                    if (e.keyCode === 13) {
                        // Cancel the default action, if needed
                        e.preventDefault();
                        //..
                        if(self.root.classList.contains('range-input-control--key-input-mode'))
                            self.root.classList.remove('range-input-control--key-input-mode');        
                        //..
                        self.value = this.value;  
                        self.isFocused = false;   
                    }
                };
                // attach handler to value input keyup event
                range_input.addEventListener("keyup", input_keyup_handler);
            //#endregion
        }
    
        /**
        * function for removing event listeners from controls
        **/
        let unbindEvents = function () {    
            //#region remove event listeners from value block
                self.root.removeEventListener('mousedown', root_mousedown_handler, false);
                self.root.removeEventListener('touchstart', root_mousedown_handler, false);
            //#endregion
    
            //#region remove event listeners from value input
                range_input.removeEventListener('focusout', input_focusout_handler, false);
                range_input.removeEventListener('keyup', input_keyup_handler, false);
            //#endregion
        };
    
        /**
        * function for deleting an layout and all related objects
        **/
        this.dispose = function () {
            // unbind events 
            unbindEvents();
            // dispose handlers
            root_mousedown_handler = null;
            input_focusout_handler = null;
            input_keyup_handler = null;
            // dispose root element
            this.root.parentNode.removeChild(this.root);
            this.root = null;
            // dispose properties
            this.min = null;
            this.max = null;
            this.step = null;
            // dispose variables       
            range_input = null;
            range_progress = null;
            range_value = null;
            folding_screen = null;
            change_on_key_input = null;
            change_on_mouse_move = null;
            last_mouse_position = null;
            eventListeners.focus.splice(0, eventListeners.focus.length);
            eventListeners.focus = null;
            eventListeners.blur.splice(0, eventListeners.blur.length);
            eventListeners.blur = null;
            eventListeners.change.splice(0, eventListeners.change.length);
            eventListeners.change = null;
            eventListeners = null;
            _value = null;
            _is_focused = null;
            self = null;

            emit = null;
            init = null;
            bindEvents = null;
            unbindEvents = null;
            // dispose all control members
            for (var member in this) delete this[member];
        };
    
        // run control initialization
        init();
    }

    /**
     * ..
     */
    function TextInputControl(root) {
        // declare properties of the control
        this.root = root;
        this.isAlphanumeric = root.dataset.isAlphanumeric || false;
        // declare private variables
        let self = this,
            text_input = root.querySelector('.text-input'),
            text_value = root.querySelector('.text-input-value'),
            root_mousedown_handler,
            input_focusout_handler,
            input_keydown_handler,
            input_keyup_handler,
            eventListeners = {
                focus: [],
                blur: [],
                change: []
            };
        
        // value property
        let _value = root.dataset.value || '';
        Object.defineProperty(self, 'value', {
            // getter function
            get: function() { 
                return _value; 
            },
            //setter function
            set: function(v){
                //..
                _value = v;
                // set value to input
                text_input.value = _value;
                // set value to label
                text_value.innerHTML = _value;
                // trigger value changed event
                emit('change', self.value);
            },
            enumerable: true,
            configurable: true
        });
    
        // is_focused property
        let _is_focused = false;
        Object.defineProperty(self, 'isFocused', {
            // getter function
            get: function() { 
                return _is_focused; 
            },
            //setter function
            set: function(v){
                // set focused state
                _is_focused = v;
                // trigger focus event
                if(_is_focused){
                    self.root.classList.add('text-input-control--focused');
                    emit('focus', self);
                }
                else{
                    emit('blur', self);
                    self.root.classList.remove('text-input-control--focused');
                }
            },
            enumerable: true,
            configurable: true
        });
    
        /**
        * function for trigger handler event
        **/
        let emit = function(event, ...args) {
            eventListeners[event].forEach(cb => cb(...args, self));
        }
    
        /**
        * function for attaching handler to event
        **/
        this.on = function(event, cb) {
            eventListeners[event].push(cb);
            return this;
        }
    
        /**
        * function for removing handler from event
        **/
        this.off = function(event, cb) {
            const callBacks = (eventListeners[event] || []);
            const index = callBacks.indexOf(cb);
            if (~index) 
                callBacks.splice(index, 1);
            return this;
        }
    
    
        /**
        * function for initialize control
        **/
        let init = function () {
            // set control value
            text_input.value = self.value;
            // set control text value
            text_value.innerHTML = self.value;
            // bind events to the controls
            bindEvents();
        };
    
        /**
        * function for adding event listeners to controls
        **/
        let bindEvents = function () {
            //#region add event listeners to value block
                // create handler for value block mousedown event
                root_mousedown_handler = function(e){
                    e.stopPropagation();
                    //..
                    if( self.root.classList.contains('text-input-control--disabled'))
                        return;
                    //..
                    self.isFocused = true;

                    //..
                    let up = function(e){      
                        //..
                        text_input.focus();
                        text_input.select();       
                    };
                    //..     
                    document.addEventListener('mouseup', up, { once: true }); 
                    document.addEventListener('touchend', up, { once: true });
                };
                // attach handler to value block mousedown event
                self.root.addEventListener('mousedown', root_mousedown_handler, true);
                self.root.addEventListener('touchstart', root_mousedown_handler, true);
            //#endregion
    
            //#region add event listeners to value input
                // create handler for value input focusout event
                input_focusout_handler = function(e){
                    this.value = self.value;
                    self.isFocused = false;
                };
                // attach handler to value input focusout event
                text_input.addEventListener("focusout", input_focusout_handler, true);
                
                // create handler for value input keydown event
                input_keydown_handler = function(e){
                    var key = e.keyCode || e.charCode;
                    if(self.isAlphanumeric){
                        if (!e.key.match(/[a-zA-Z0-9]/) || (document.getSelection().toString().length == 0 && (key !== 37 && key !== 39) && this.value.length == 6 && key!=8 && key!=46)) {
                            e.preventDefault();  
                        }
                    }
                };
                // attach handler to value input keydown event
                text_input.addEventListener("keydown", input_keydown_handler, true);

                // create handler for value input keyup event
                input_keyup_handler = function(e){
                    // 27...Escape
                    if (e.keyCode === 27) {
                        // Cancel the default action, if needed
                        e.preventDefault();
                        this.value = self.value;
                        self.isFocused = false;
                        //....
                    }
                    // Number 13 is the "Enter" key on the keyboard
                    if (e.keyCode === 13) {
                        // Cancel the default action, if needed
                        e.preventDefault();      
                        //..
                        self.value = this.value; 
                        //..
                        self.isFocused = false;   
                    }
                };
                // attach handler to value input keyup event
                text_input.addEventListener("keyup", input_keyup_handler, true);
            //#endregion
        }
    
        /**
        * function for removing event listeners from controls
        **/
        let unbindEvents = function () {    
            //#region remove event listeners from value block
                self.root.removeEventListener('mousedown', root_mousedown_handler, false);
                self.root.removeEventListener('touchstart', root_mousedown_handler, false);
            //#endregion
    
            //#region remove event listeners from value input
                text_input.removeEventListener('focusout', input_focusout_handler, false);
                text_input.removeEventListener("keydown", input_keydown_handler, false);
                text_input.removeEventListener('keyup', input_keyup_handler, false);
            //#endregion
        };
    
        /**
        * function for deleting an layout and all related objects
        **/
        this.dispose = function () {
            // unbind events 
            unbindEvents();
            // dispose handlers
            root_mousedown_handler = null;
            input_focusout_handler = null;
            input_keydown_handler = null;
            input_keyup_handler = null;
            // dispose properties
            this.value = null;
            this.isFocused = null;
            this.root.parentNode.removeChild(this.root);
            this.root = null;       
            this.isAlphanumeric = null;
            // dispose variables   
            _value = null;
            _is_focused = null;  
            root = null;
            eventListeners.focus.splice(0, eventListeners.focus.length);
            eventListeners.focus = null;
            eventListeners.blur.splice(0, eventListeners.blur.length);
            eventListeners.blur = null;
            eventListeners.change.splice(0, eventListeners.change.length);
            eventListeners.change = null;
            eventListeners = null;
            text_input = null;
            text_value = null;
            self = null;
            
            emit = null;
            init = null;
            bindEvents = null;
            unbindEvents = null;
            // dispose all control members
            for (var member in this) delete this[member];
        };
    
        // run control initialization
        init();
    }

    
    // run initialization of color picker control
    init();
}

