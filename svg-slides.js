'use strict';

class SvgSlides {
  constructor (rootNode, options) {
    var self = this;

    if (rootNode) {
      this._rootNode = rootNode;
    } else {
      this._rootNode = document.querySelector('svg');
    }
    this._options = {};
    Object.keys(SvgSlides.defaultOptions).forEach(function (key) {
      var value;

      if (options && options[key]) {
        value = options[key];
      } else {
        value = SvgSlides.defaultOptions[key];
      }

      self._options[key] = value;
    });

    this._error = this.options.logger.error;
    this._info = this.options.logger.info;
    this._debug = this.options.logger.debug;

    this._eventHandler = {
      'click': this.onClick,
      'hashchange': this.onHashChange,
      'keydown': this.onKeyDown,
      'load': this.onLoad,
      'wheel': this.onMouseWheel
    };
  }

  static get actions () {
    return {
      firstSlide: function () {
        this.currentSlideIndex = 0;
      },
      lastSlide: function () {
        this.currentSlideIndex = this.slides.length - 1;
      },
      nextSlide: function () {
        this.currentSlideIndex++;
      },
      overview: function () {
        this.transitionTo(this.rootNode);
      },
      previousSlide () {
        this.currentSlideIndex--;
      }
    };
  }

  get currentSlide () {
    if ((0 <= this.currentSlideIndex) && (this.currentSlideIndex < this.slides.length)) {
      return this.slides[this.currentSlideIndex];
    } else {
      return this.rootNode;
    }
  }

  get currentSlideIndex () {
    return this._currentSlideIndex;
  }

  set currentSlideIndex (newSlideIndex) {
    if (this.slides.length === 0) {
      newSlideIndex = null;
    }

    if (newSlideIndex < 0) {
      newSlideIndex = 0;
    }

    if (newSlideIndex > this.slides.length - 1) {
      newSlideIndex = this.slides.length - 1;
    }

    this._currentSlideIndex = newSlideIndex;
    this.transitionTo(this.currentSlide);
  }

  static get defaultOptions () {
    var keyBindings = new Map();
    keyBindings.set('ArrowLeft', SvgSlides.actions.previousSlide);
    keyBindings.set('ArrowRight', SvgSlides.actions.nextSlide);
    keyBindings.set('Left', SvgSlides.actions.previousSlide);
    keyBindings.set('End', SvgSlides.actions.lastSlide);
    keyBindings.set('Escape', SvgSlides.actions.overview);
    keyBindings.set('Home', SvgSlides.actions.firstSlide);
    keyBindings.set('Right', SvgSlides.actions.nextSlide);
    keyBindings.set('Space', SvgSlides.actions.nextSlide);
    keyBindings.set('U+001B', SvgSlides.actions.overview);

    return {
      keyBindings: keyBindings,
      logger: {
        debug: function () {
          // ignore
        },
        info: function (message) {
          console.log(message);
        },
        error: function (message) {
          console.error(message);
        }
      },
      slideSelector: '[id^=slide_]',
      sortSlidesBy: 'id',
      zoomFactor: 1.25
    };
  }

  handleEvent (event) {
    var handler = this._eventHandler[event.type];

    if (handler) {
      handler.call(this, event);
    } else {
      this._error(`No handler for event ${event.type}!`);
    }
  }

  onClick (event) {
    var slideIndex = this.slides.indexOf(event.target);
    if (slideIndex > -1) {
      this.currentSlideIndex = slideIndex;
    }
  }

  onHashChange () {
    var hash = window.location.hash || '';
    var slideId = hash.replace(/^#/, '');

    var matchingSlides = this.slides.filter(function (slide) {
      return (slide.id === slideId);
    });

    if (matchingSlides.length === 0) {
      this._error(`No slide found with id "${slideId}"!`);
      this.currentSlideIndex = 0;
      return;
    }

    if (matchingSlides.length > 1) {
      this._error(`More than one slide found with id "${slideId}", using the first one!`);
    }

    var newSlideIndex = this.slides.indexOf(matchingSlides[0]);
    if (newSlideIndex != this.currentSlideIndex) {
      this.currentSlideIndex = newSlideIndex;
    }
  }

  onKeyDown (event) {
    var key = event.code || event.keyIdentifier;
    var keyBindings = this.options.keyBindings;

    var keyBinding;
    if (keyBindings instanceof Map) {
      keyBinding = keyBindings.get(key);
    } else {
      keyBinding = keyBindings[key];
    }

    if (keyBinding) {
      keyBinding.call(this);
    } else {
      this._debug(`No keybinding for ${key}`);
    }
  }

  onLoad () {
    this._info('Powered by d3 v' + d3.version);
    var rootNodeSelection = d3.select(this.rootNode);
    rootNodeSelection.attr('preserveAspectRatio', 'xMidYMid meet');
    rootNodeSelection.attr('width', '100%');
    rootNodeSelection.attr('height', '100%');
    rootNodeSelection.attr('zoomAndPan', 'disable'); // sadly this is not supported by all browsers, so disable it for all

    this._slides = [];
    let slideNodes = this.rootNode.querySelectorAll(this.options.slideSelector);
    let slideIds = [];
    for (let slideIndex = 0; slideIndex < slideNodes.length; ++slideIndex) {
      let slide = slideNodes[slideIndex];
      this._slides.push(slide);

      if (slideIds.indexOf(slide.id) > -1) {
        this._error(`Found duplicate slide id: ${slide.id}`);
      }
      slideIds.push(slide.id);
    }

    if (this.slides.length > 0) {
      this._info(`Found the following slides: ${slideIds}`);

      var sortKey = this.options.sortSlidesBy;
      var slideComparator = function compare (firstSlide, secondSlide) {
        var firstSortKey = firstSlide[sortKey].toString();
        var secondSortKey = secondSlide[sortKey].toString();
        if (firstSortKey < secondSortKey) {
          return -1;
        } else if (firstSortKey > secondSortKey) {
          return 1;
        } else {
          return 0;
        }
      };

      this._slides.sort(slideComparator);
    } else {
      this._error('Found no slides!');
    }

    var self = this;
    Object.keys(this._eventHandler).forEach(function (eventType) {
      if (eventType !== 'load') {
        window.addEventListener(eventType, self);
      }
    });

    // start presentation
    this.currentSlideIndex = 0;
  }

  onMouseWheel (event) {
    var zoomFactor = this.options.zoomFactor;
    if (event.wheelDelta > 0) {
      this._debug('Zooming in');
      zoomFactor = 1 / zoomFactor;
    } else {
      this._debug('Zooming out');
    }

    var rootNodeSelection = d3.select(this.rootNode);
    var oldViewBox = rootNodeSelection.attr('viewBox').split(' ');
    oldViewBox = {
      left: parseInt(oldViewBox[0]),
      top: parseInt(oldViewBox[1]),
      width: parseInt(oldViewBox[2]),
      height: parseInt(oldViewBox[3])
    };

    var viewBox = {
      left: oldViewBox.left + (oldViewBox.width - oldViewBox.width * zoomFactor) / 2,
      top: oldViewBox.top + (oldViewBox.height - oldViewBox.height * zoomFactor) / 2,
      width: oldViewBox.width * zoomFactor,
      height: oldViewBox.height * zoomFactor
    };

    this._debug(`Setting viewBox to ${viewBox.left},${viewBox.top},${viewBox.width},${viewBox.height}...`);
    rootNodeSelection.attr('viewBox', `${viewBox.left} ${viewBox.top} ${viewBox.width} ${viewBox.height}`);
  }

  get options () {
    return this._options;
  }

  get rootNode () {
    return this._rootNode;
  }

  get slides () {
    return this._slides;
  }

  transitionTo (slide) {
    if (!slide || !(slide instanceof SVGElement)) {
      return;
    }

    if (this.slides.indexOf(slide) > -1) {
      this._info(`Transitioning to slide ${slide.id}...`);
      window.location.hash = `#${slide.id}`;
    } else if (slide === this.rootNode) {
      this._debug(`Transitioning to overview...`);
    } else {
      this._error('Passed argument is neither slide nor overview!');
      return;
    }

    var boundingBox = slide.getBBox();
    var margin = {
      x: boundingBox.width / 100,
      y: boundingBox.height / 100
    };
    var viewBox = {
      left: boundingBox.x - margin.x,
      top: boundingBox.y - margin.y,
      width: boundingBox.width + 2 * margin.x,
      height: boundingBox.height + 2 * margin.y
    };

    var rootNodeSelection = d3.select(this.rootNode);
    rootNodeSelection.transition()
      .attr('viewBox', `${viewBox.left} ${viewBox.top} ${viewBox.width} ${viewBox.height}`);
  }
}
