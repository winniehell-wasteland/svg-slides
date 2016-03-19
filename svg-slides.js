'use strict';

class SvgSlides {
  constructor (options) {
    var self = this;

    if (!options) {
      options = {};
    }

    console.log('Powered by d3 v' + d3.version);
    var svg = d3.select('svg');
    svg.attr('preserveAspectRatio', 'xMidYMid meet');
    svg.attr('width', '100%');
    svg.attr('height', '100%');

    this._slides = svg.selectAll(options.slideSelector || SvgSlides.defaultOptions.slideSelector)[0];

    this._sortedSlideIds = this.slides.map(function (slide) {
      return slide.id;
    }).sort();

    if (this._sortedSlideIds.length > 0) {
      console.log(`Found the following slides: ${this._sortedSlideIds}`);
    } else {
      console.error('Found no slides!');
    }

    this._sortedSlideIds.forEach(function (slideId, index) {
      if (self._sortedSlideIds.indexOf(slideId) != index) {
        console.error(`Found duplicate slide: ${slideId}`);
      }
    });

    this.slides.forEach(function (slideNode) {
      slideNode.addEventListener('click', onClickSlide);

      function onClickSlide (event) {
        self.currentSlideId = slideNode.id;
      }
    });

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('hashchange', onHashChange);

    svg.on('wheel', onMouseWheel);

    // start presentation
    onHashChange();

    function onHashChange () {
      var slideId = self.currentSlideId;
      if (!slideId) {
        if (self._sortedSlideIds.length > 0) {
          self.currentSlideId = self._sortedSlideIds[0];
        } else {
          self.currentSlideId = 'overview';
        }
        return;
      }

      var viewBoxPattern = /viewBox=(-?\d+\.?\d*),(-?\d+\.?\d*),(-?\d+\.?\d*),(-?\d+\.?\d*)/;

      if (slideId === 'overview') {
        console.log(`Transitioning to overview..`);
        transitionTo(svg.node());
      } else if (viewBoxPattern.test(slideId)) {
        var match = viewBoxPattern.exec(slideId);
        var viewBox = {
          left: match[1],
          top: match[2],
          width: match[3],
          height: match[4]
        };
        console.log(`Setting viewBox to ${viewBox.left},${viewBox.top},${viewBox.width},${viewBox.height}...`);
        svg.attr('viewBox', `${viewBox.left} ${viewBox.top} ${viewBox.width} ${viewBox.height}`);
      } else {
        console.log(`Transitioning to slide ${slideId}...`);
        var slideNode = d3.select('#' + slideId).node();
        transitionTo(slideNode);
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

      var oldViewBox = svg.attr('viewBox')
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

    function transitionTo (svgElement) {
      if (!svgElement) {
        return;
      }

      var boundingBox = svgElement.getBBox();
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
      svg.transition()
        .attr('viewBox', `${viewBox.left} ${viewBox.top} ${viewBox.width} ${viewBox.height}`);
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
  }

  get currentSlideIndex () {
    return this._sortedSlideIds.indexOf(this.currentSlideId);
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
      slideSelector: '[id^=slide_]'
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

  get slides () {
    return this._slides;
  }

  transitionToFirstSlide () {
    this.currentSlideId = this._sortedSlideIds[0];
  }

  transitionToLastSlide () {
    this.currentSlideId = this._sortedSlideIds[this._sortedSlideIds.length - 1];
  }

  transitionToNextSlide () {
    if (this.currentSlideIndex < this._sortedSlideIds.length - 1) {
      this.currentSlideId = this._sortedSlideIds[this.currentSlideIndex + 1];
    }
  }

  transitionToOverview () {
    this.currentSlideId = 'overview';
  }

  transitionToPreviousSlide () {
    if (this.currentSlideIndex > 0) {
      this.currentSlideId = this._sortedSlideIds[this.currentSlideIndex - 1];
      return this.currentSlideId;
    }
  }
}
