// Copyright 2014, Yahoo! Inc.
// Copyrights licensed under the Mit License. See the accompanying LICENSE file for terms.

var nodePath = require('path');

var PNGImage = require('pngjs-image');
var Promise = require('promise');
var _ = require('underscore');

var Base = require('preceptor-core').Base;
var utils = require('preceptor-core').utils;

/**
 * @class BaseObject
 * @extends Base
 *
 * @property {Element} _context
 * @property {string[]} _loadSelectors
 * @property {object} _selectors
 */
var BaseObject = Base.extend(

	/**
	 * Base-Object constructor
	 *
	 * @constructor
	 * @param {Element} context
	 * @param {int} [timeOut]
	 * @param {int} [waitInMs]
	 */
	function (context, timeOut, waitInMs) {
		this.__super();

		this._context = context;
		this._loadSelectors = [];
		this._selectors = {};

		this.initialize();

		this.verifyIsLoaded(timeOut, waitInMs);
	},

	{
		/**
		 * Initializes the base-object
		 *
		 * @method initialize
		 */
		initialize: function () {
			// Nothing by default
		},


		/**
		 * Verifies that the page-object and its sub-dom-elements are loaded as expected
		 *
		 * @method verifyIsLoaded
		 * @param {int} [timeOut]
		 * @param {int} [waitInMs]
		 * @return {BaseObject}
		 */
		verifyIsLoaded: function (timeOut, waitInMs) {
			return this.waitForElements(this._loadSelectors, timeOut, waitInMs);
		},


		/**
		 * Adds multiple load selectors, elements that should be selected when object is loaded
		 *
		 * @method addLoadSelectors
		 * @param {string[]} selectors
		 * @return {BaseObject}
		 */
		addLoadSelectors: function (selectors) {
			_.each(selectors, function (selector) {
				this.addLoadSelector(selector);
			}, this);
			return this;
		},

		/**
		 * Adds a single load selector, elements that should be selected when object is loaded
		 *
		 * @method addLoadSelector
		 * @param {string} selector
		 * @return {BaseObject}
		 */
		addLoadSelector: function (selector) {
			if (!this.hasSelector) {
				throw new Error('Cannot add an unknown selector to the load selector list: ' + selector);
			}
			this._loadSelectors.push(selector);
			return this;
		},


		/**
		 * Get the page-object context
		 *
		 * @method getContext
		 * @return {Element}
		 */
		getContext: function () {
			return this._context;
		},

		/**
		 * Gets the web-driver adapter
		 *
		 * @method getAdapter
		 * @return {DriverAdapter}
		 */
		getAdapter: function () {
			return BaseObject.getDriverAdapter();
		},


		/**
		 * Get a list of all selectors
		 *
		 * @method getSelectors
		 * @return {object}
		 */
		getSelectors: function () {
			return this._selectors;
		},

		/**
		 * Sets the selectors
		 *
		 * @method setSelectors
		 * @param {object} selectors
		 */
		setSelectors: function (selectors) {
			this._selectors = selectors;
		},

		/**
		 * Gets a specific selector by name
		 *
		 * @method getSelector
		 * @param {string} selectorName
		 * @return {string}
		 */
		getSelector: function (selectorName) {
			var selectors = this.getSelectors();
			return selectors[selectorName];
		},

		/**
		 * Does it have a specific selector by name
		 *
		 * @method hasSelector
		 * @param {string} selectorName
		 * @return {boolean}
		 */
		hasSelector: function (selectorName) {
			var selectors = this.getSelectors();
			return !!selectors[selectorName];
		},


		/**
		 * Gets an element by a selector name
		 *
		 * @method getElement
		 * @param {string} selectorName
		 * @return {Element}
		 */
		getElement: function (selectorName) {
			var context = this.getContext(),
				selector = this.getSelector(selectorName);

			return this.getAdapter().getElement(context, selector, 'css selector');
		},

		/**
		 * Checks if a selector name does exist in the selector list
		 *
		 * @method hasElement
		 * @param {string} selectorName
		 * @return {boolean}
		 */
		hasElement: function (selectorName) {
			var context = this.getContext(),
				selector = this.getSelector(selectorName);

			return (this.getAdapter().getElements(context, selector, 'css selector').length !== 0);
		},

		/**
		 * Waits for the element to appear on the page
		 *
		 * @method waitForElements
		 * @param {string[]} selectors
		 * @param {int} [timeOut=10000]
		 * @param {int} [waitInMs=500]
		 * @return {BaseObject}
		 */
		waitForElements: function (selectors, timeOut, waitInMs) {

			this.waitUntil(function () {

				var allLoaded = true;

				_.each(selectors, function (selector) {
					if (allLoaded) {
						allLoaded = allLoaded && this.hasElement(selector);
					}
				}, this);

				return allLoaded;

			}.bind(this), "Waited for selectors '" + selectors.join(', ') + "'", timeOut, waitInMs);

			return this;
		},


		/**
		 * Wait until a callback returns a truthy value
		 *
		 * @method waitUntil
		 * @param {function} fn
		 * @param {string} message
		 * @param {int} [timeOut=10000]
		 * @param {int} [waitInMs=500]
		 * @return {BaseObject}
		 */
		waitUntil: function (fn, message, timeOut, waitInMs) {

			var startTime = (+new Date()),
				result;

			timeOut = timeOut || 10000;
			waitInMs = waitInMs || 500;

			result = fn();
			if (result && result.then) {
				// TODO: Make it "Promise safe"
			} else {

				while (!fn()) {

					if ((+new Date()) - startTime >= timeOut) {
						throw new Error("Waited for an event, but timed-out. Message:" + message);
					}

					this.getAdapter().sleep(waitInMs);
				}
			}

			return this;
		},


		/**
		 * Get the coordinates and size of an element
		 *
		 * @method getFrame
		 * @param {string} [selectorName] Defaults to current context
		 * @return {object} `{x: int, y: int, width: int, height: int}`
		 */
		getFrame: function (selectorName) {
			var element;

			if (selectorName) {
				element = this.getElement(selectorName);
			} else {
				element = this.getContext();
			}

			if (element.getFrame) {
				return element.getFrame();
			} else {
				return { x: 0, y: 0, width: 0, height: 0 };
			}
		},


		/**
		 * List of blackout coordinates for the current page-object
		 *
		 * @method blackOut
		 * @return {object[]}
		 */
		blackOut: function () {
			return [];
		},

		/**
		 * Captures the current page-object
		 *
		 * @method capture
		 * @param {string} title Title of test or part of identifier
		 * @param {string} [id='1'] Identifier for screenshot file
		 * @param {int} [wait=1000] Wait before a screenshot is taken
		 * @param {object[]} [additionalBlackOuts] Additional black-outs
		 * @return {Promise}
		 */
		capture: function (title, id, wait, additionalBlackOuts) {

			var self = this, image, promise,
				blackOutList, frame, buffer,
				fileName, path, prefix;

			this.getAdapter().sleep(wait || 1000);

			blackOutList = this.blackOut().concat(additionalBlackOuts || []);

			blackOutList = blackOutList.map(function (entry) {
				if (entry.x === undefined) {
					return entry.getFrame();
				} else {
					return entry;
				}
			});

			frame = this.getFrame();
			buffer = this.getAdapter().takeScreenshot();
			prefix = BaseObject.getScreenshotPrefix();

			fileName = utils.fileNameSafe(title) + '_' + utils.fileNameSafe(id || '1') + '.png';
			if (prefix) {
				fileName = utils.fileNameSafe(prefix) + '_' + fileName;
			}
			path = nodePath.join(BaseObject.getScreenshotPath(), fileName);

			promise = new Promise(function (resolve, reject) {

				try {

					image = PNGImage.loadImage(buffer, function (err) {

						var i, len;

						if (err) {
							throw err;
						}

						// Fill-in areas for black-out
						for (i = 0, len = blackOutList.length; i < len; i++) {
							image.fillRect(blackOutList[i].x, blackOutList[i].y, blackOutList[i].width, blackOutList[i].height, {
								red: 0,
								green: 0,
								blue: 0,
								alpha: 255
							});
						}

						// Clip screenshot to the area of the context
						if ((frame.width !== 0) && (frame.height !== 0)) {
							image.clip(frame.x, frame.y, frame.width, frame.height);
						}

						// Write to disk
						image.writeImage(path, function (err) {

							if (err) {
								throw err;
							}

							resolve(self);

						});
					});

				} catch (err) {
					reject(err);
				}
			});

			return promise;
		}
	},

	{
		/**
		 * @property TYPE
		 * @type {string}
		 * @static
		 */
		TYPE: 'BaseObject',

		/**
		 * Gets the path for the screenshot results
		 *
		 * @method getScreenshotPath
		 * @return {string}
		 * @static
		 */
		getScreenshotPath: function () {
			return this.SCREENSHOT_PATH || global.SCREENSHOT_PATH || process.env.SCREENSHOT_PATH;
		},

		/**
		 * Gets the screenshot prefix
		 *
		 * @method getScreenshotPrefix
		 * @return {string}
		 * @static
		 */
		getScreenshotPrefix: function () {
			return this.SCREENSHOT_PREFIX || global.SCREENSHOT_PREFIX || process.env.SCREENSHOT_PREFIX;
		},

		/**
		 * Gets the web-driver adapter
		 *
		 * @method getDriverAdapter
		 * @return {DriverAdapter}
		 * @static
		 */
		getDriverAdapter: function () {
			return this.DRIVER_ADAPTER || global.DRIVER_ADAPTER;
		}
	});

module.exports = BaseObject;