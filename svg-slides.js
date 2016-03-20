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
  }

  get currentSlide () {
    if ((0 <= this.currentSlideIndex) && (this.currentSlideIndex < this.slides.length)) {
      return this.slides[this.currentSlideIndex];
    } else {
      return this.rootNodeSelection.node();
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
    keyBindings.set('ArrowLeft', 'transitionToPreviousSlide');
    keyBindings.set('Left', 'transitionToPreviousSlide');
    keyBindings.set('ArrowRight', 'transitionToNextSlide');
    keyBindings.set('Right', 'transitionToNextSlide');
    keyBindings.set('Space', 'transitionToNextSlide');
    keyBindings.set('End', 'transitionToLastSlide');
    keyBindings.set('Home', 'transitionToFirstSlide');
    keyBindings.set('Escape', 'transitionToOverview');
    keyBindings.set('U+001B', 'transitionToOverview');

    return {
      keyBindings: keyBindings,
      rootNodeSelector: 'svg',
      slideSelector: '[id^=slide_]',
      sortSlidesBy: 'id'
    };
  }

  handleEvent (event) {
    switch (event.type) {
      case 'click':
        return this.onClick(event);
      case 'hashchange':
        return this.onHashChange(event);
      case 'keydown':
        return this.onKeyDown(event);
      case 'load':
        return this.onLoad(event);
      case 'wheel':
        return this.onMouseWheel(event);
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
      console.error(`No slide found with id "${slideId}"!`);
      this.transitionToFirstSlide();
      return;
    }

    if (matchingSlides.length > 1) {
      console.error(`More than one slide found with id "${slideId}", using the first one!`);
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
    
    if (typeof(keyBinding) === 'string' || keyBinding instanceof String) {
      keyBinding = this[keyBinding].bind(this);
    }

    if (keyBinding) {
      keyBinding();
    } else {
      console.log(`No keybinding for ${key}`);
    }
  }

  onLoad (event) {
    var self = this;

    console.log('Powered by d3 v' + d3.version);
    this._rootNodeSelection = d3.select(this.options.rootNodeSelector);
    this.rootNodeSelection.attr('preserveAspectRatio', 'xMidYMid meet');
    this.rootNodeSelection.attr('width', '100%');
    this.rootNodeSelection.attr('height', '100%');
    this.rootNodeSelection.attr('zoomAndPan', 'disable'); // sadly this is not supported by all browsers, so disable it for all

    this._slides = this.rootNodeSelection.selectAll(this.options.slideSelector)[0];

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

    window.addEventListener('click', this);
    window.addEventListener('hashchange', this);
    window.addEventListener('keydown', this);
    window.addEventListener('wheel', this);

    // start presentation
    this.transitionToFirstSlide();
  }

  onMouseWheel (event) {
    var mousePosition = this.rootNodeSelection.node().createSVGPoint();
    mousePosition.x = event.clientX;
    mousePosition.y = event.clientY;

    var svgPointTransformation = this.rootNodeSelection.node().getScreenCTM().inverse();
    mousePosition = mousePosition.matrixTransform(svgPointTransformation);

    var zoom;
    if (event.wheelDelta > 0) {
      console.log('Zooming in');
      zoom = 0.8;
    } else {
      console.log('Zooming out');
      zoom = 1.25;
    }

    var oldViewBox = this.rootNodeSelection.attr('viewBox')
      .split(' ')
      .map(function (component) {
        return parseInt(component);
      });

    var viewBox = {
      left: mousePosition.x - (mousePosition.x - oldViewBox[0]) * zoom,
      top: mousePosition.y - (mousePosition.y - oldViewBox[1]) * zoom,
      width: oldViewBox[2] * zoom,
      height: oldViewBox[3] * zoom
    };

    console.log(`Setting viewBox to ${viewBox.left},${viewBox.top},${viewBox.width},${viewBox.height}...`);
    this.rootNodeSelection.attr('viewBox', `${viewBox.left} ${viewBox.top} ${viewBox.width} ${viewBox.height}`);
  }

  get options () {
    return this._options;
  }

  get rootNodeSelection () {
    return this._rootNodeSelection;
  }

  get slides () {
    return this._slides;
  }

  transitionTo (slide) {
    if (!slide || !(slide instanceof SVGElement)) {
      return;
    }

    if (this.slides.indexOf(slide) > -1) {
      console.log(`Transitioning to slide ${slide.id}...`);
      window.location.hash = `#${slide.id}`;
    } else if (slide === this.rootNodeSelection.node()) {
      console.log(`Transitioning to overview...`);
    } else {
      console.error('Passed argument is neither slide nor overview!');
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

    this.rootNodeSelection.transition()
      .attr('viewBox', `${viewBox.left} ${viewBox.top} ${viewBox.width} ${viewBox.height}`);
  }

  transitionToFirstSlide () {
    this.currentSlideIndex = 0;
  }

  transitionToLastSlide () {
    this.currentSlideIndex = this.slides.length - 1;
  }

  transitionToNextSlide () {
    this.currentSlideIndex++;
  }

  transitionToOverview () {
    this.transitionTo(this.rootNodeSelection.node());
  }

  transitionToPreviousSlide () {
    this.currentSlideIndex--;
  }
}
