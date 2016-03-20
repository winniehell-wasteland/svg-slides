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
        this.transitionTo(this.rootNodeSelection.node());
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
      this.currentSlideIndex = 0;
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

    if (keyBinding) {
      keyBinding.call(this);
    } else {
      console.log(`No keybinding for ${key}`);
    }
  }

  onLoad () {
    console.log('Powered by d3 v' + d3.version);
    this._rootNodeSelection = d3.select(this.options.rootNodeSelector);
    this.rootNodeSelection.attr('preserveAspectRatio', 'xMidYMid meet');
    this.rootNodeSelection.attr('width', '100%');
    this.rootNodeSelection.attr('height', '100%');
    this.rootNodeSelection.attr('zoomAndPan', 'disable'); // sadly this is not supported by all browsers, so disable it for all

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

    this._slides = this.rootNodeSelection.selectAll(this.options.slideSelector)[0].sort(slideComparator);

    if (this.slides.length > 0) {
      var slideIds = this.slides.map(function (slide) {
        return slide.id;
      });
      console.log(`Found the following slides: ${slideIds}`);

      slideIds.forEach(function (slideId, currentIndex) {
        if (slideIds.indexOf(slideId) !== currentIndex) {
          console.error(`Found duplicate slide id: ${slideId}`);
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
    this.currentSlideIndex = 0;
  }

  onMouseWheel (event) {
    var zoom;
    if (event.wheelDelta > 0) {
      console.log('Zooming in');
      zoom = 0.8;
    } else {
      console.log('Zooming out');
      zoom = 1.25;
    }

    var oldViewBox = this.rootNodeSelection.attr('viewBox').split(' ');
    oldViewBox = {
      left: parseInt(oldViewBox[0]),
      top: parseInt(oldViewBox[1]),
      width: parseInt(oldViewBox[2]),
      height: parseInt(oldViewBox[3])
    };

    var viewBox = {
      left: oldViewBox.left + (oldViewBox.width - oldViewBox.width * zoom) / 2,
      top: oldViewBox.top + (oldViewBox.height - oldViewBox.height * zoom) / 2,
      width: oldViewBox.width * zoom,
      height: oldViewBox.height * zoom
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
}
