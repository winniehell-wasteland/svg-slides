'use strict';

class SvgSlides {
  constructor (options) {
    var self = this;

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

    console.log('Powered by d3 v' + d3.version);
    this._rootNode = d3.select(this.options.rootNodeSelector);
    this.rootNode.attr('preserveAspectRatio', 'xMidYMid meet');
    this.rootNode.attr('width', '100%');
    this.rootNode.attr('height', '100%');

    this._slides = this.rootNode.selectAll(this.options.slideSelector)[0];

    this._slides = this._slides.sort(function compareSlides (a, b) {
      var sortKeyA = a[self.options.sortSlidesBy].toString();
      var sortKeyB = b[self.options.sortSlidesBy].toString();
      if (sortKeyA < sortKeyB) {
        return -1;
      } else if (sortKeyA > sortKeyB) {
        return 1;
      } else {
        return 0;
      }
    });

    if (this.slides.length > 0) {
      var slideIds = this.slides.map(function (slide) {
        return slide.id;
      });
      console.log(`Found the following slides: ${slideIds}`);

      slideIds.forEach(function (slideId) {
        var matchingSlides = self.slides.filter(function (slide) {
          return (slide.id === slideId);
        });
        if (matchingSlides.length > 1) {
          console.error(`Found duplicate slide id: ${slide.id}`);
        }
      });
    } else {
      console.error('Found no slides!');
    }

    this.slides.forEach(function (slide) {
      slide.addEventListener('click', onClickSlide);

      function onClickSlide (event) {
        self.currentSlideId = slide.id;
      }
    });

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('hashchange', onHashChange);

    self.rootNode.on('wheel', onMouseWheel);

    // start presentation
    self.transitionToFirstSlide();

    function onHashChange () {
      var viewBoxPattern = /viewBox=(-?\d+\.?\d*),(-?\d+\.?\d*),(-?\d+\.?\d*),(-?\d+\.?\d*)/;

      if (viewBoxPattern.test(slideId)) {
        var match = viewBoxPattern.exec(slideId);
        var viewBox = {
          left: match[1],
          top: match[2],
          width: match[3],
          height: match[4]
        };
        console.log(`Setting viewBox to ${viewBox.left},${viewBox.top},${viewBox.width},${viewBox.height}...`);
        self.rootNode.attr('viewBox', `${viewBox.left} ${viewBox.top} ${viewBox.width} ${viewBox.height}`);
      } else {
        var slideId = self.currentSlideId;
        if (!slideId || (self.currentSlideIndex < 0)) {
          self.transitionToFirstSlide();
          return;
        }

        console.log(`Transitioning to slide ${slideId}...`);
        var slideNode = d3.select('#' + slideId).node();
        self.transitionTo(slideNode);
      }
    }

    function onKeyDown (event) {
      var key = event.code || event.keyIdentifier;

      var keyBinding;
      if (self._keyBindings instanceof Map) {
        keyBinding = self._keyBindings.get(key);
      } else {
        keyBinding = self._keyBindings[key];
      }

      if (keyBinding) {
        keyBinding();
      } else {
        console.log(`No keybinding for ${key}`);
      }
    }

    function onMouseWheel () {
      var zoom;
      if (d3.event.wheelDelta > 0) {
        console.log('Zooming in');
        zoom = 0.8;
      } else {
        console.log('Zooming out');
        zoom = 1.25;
      }

      var oldViewBox = self.rootNode.attr('viewBox')
        .split(' ')
        .map(function (component) {
          return parseInt(component);
        });

      var mouse = d3.mouse(this);
      var viewBox = {
        left: mouse[0] - (mouse[0] - oldViewBox[0]) * zoom,
        top: mouse[1] - (mouse[1] - oldViewBox[1]) * zoom,
        width: oldViewBox[2] * zoom,
        height: oldViewBox[3] * zoom
      };
      setViewBox(viewBox);
    }

    function setViewBox (viewBox) {
      window.location.hash = `#viewBox=${viewBox.left},${viewBox.top},${viewBox.width},${viewBox.height}`;
    }
  }

  get currentSlideId () {
    var hash = window.location.hash || '';
    if (hash === '') {
      return null;
    } else {
      return hash.replace(/^#/, '');
    }
  }

  set currentSlideId (slideId) {
    window.location.hash = `#${slideId}`;

    var currentSlides = this.slides.filter(function (slide) {
      return (slide.id === slideId);
    });

    if (currentSlides.length === 0) {
      console.error(`No slide found with id "${slideId}"!`);
      return -1;
    }

    if (currentSlides.length > 1) {
      console.error(`More than one slide found with id "${slideId}", using the first one!`);
    }

    this._currentSlideIndex = this.slides.indexOf(currentSlides[0]);
  }

  get currentSlideIndex () {
    return this._currentSlideIndex;
  }

  get defaultKeyBindings () {
    var keyBindings = new Map();
    keyBindings.set('ArrowLeft', this.transitionToPreviousSlide.bind(this));
    keyBindings.set('Left', this.transitionToPreviousSlide.bind(this));
    keyBindings.set('ArrowRight', this.transitionToNextSlide.bind(this));
    keyBindings.set('Right', this.transitionToNextSlide.bind(this));
    keyBindings.set('Space', this.transitionToNextSlide.bind(this));
    keyBindings.set('End', this.transitionToLastSlide.bind(this));
    keyBindings.set('Home', this.transitionToFirstSlide.bind(this));
    keyBindings.set('Escape', this.transitionToOverview.bind(this));
    keyBindings.set('U+001B', this.transitionToOverview.bind(this));
    return keyBindings;
  }

  static get defaultOptions () {
    return {
      rootNodeSelector: 'svg',
      slideSelector: '[id^=slide_]',
      sortSlidesBy: 'id'
    };
  }

  set keyBindings (newKeyBindings) {
    this._keyBindings = newKeyBindings;
  }

  static load () {
    window.addEventListener('load', function () {
      var svgSlides = new SvgSlides();
      svgSlides.keyBindings = svgSlides.defaultKeyBindings;
    });
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

    console.log(`Setting viewBox to ${viewBox.left},${viewBox.top},${viewBox.width},${viewBox.height}...`);
    this.rootNode.transition()
      .attr('viewBox', `${viewBox.left} ${viewBox.top} ${viewBox.width} ${viewBox.height}`);
  }

  transitionToFirstSlide () {
    if (this.slides.length === 0) {
      this.transitionToOverview();
    } else {
      this.currentSlideId = this.slides[0].id;
    }
  }

  transitionToLastSlide () {
    if (this.slides.length === 0) {
      this.transitionToOverview();
    } else {
      this.currentSlideId = this.slides[this.slides.length - 1].id;
    }
  }

  transitionToNextSlide () {
    if (this.slides.length === 0) {
      this.transitionToOverview();
    } else if (this.currentSlideIndex < this.slides.length - 1) {
      this.currentSlideId = this.slides[this.currentSlideIndex + 1].id;
    }
  }

  transitionToOverview () {
    console.log(`Transitioning to overview..`);
    this.transitionTo(this.rootNode.node());
  }

  transitionToPreviousSlide () {
    if (this.slides.length === 0) {
      this.transitionToOverview();
    } else if (this.currentSlideIndex > 0) {
      this.currentSlideId = this.slides[this.currentSlideIndex - 1].id;
    }
  }
}
