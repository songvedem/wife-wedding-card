/**
 * Wedding Card - DOM Population & Interactive Features
 *
 * Reads from WEDDING_CONFIG (defined in config.js) and populates all
 * text content and image sources in the HTML. Also handles:
 *  - Page preloader
 *  - Auto-scroll hint (after cover fade-in, until user interaction)
 *  - Scroll animations (AOS-like)
 *  - Gallery Swiper carousel + lightbox
 *  - Wishes form AJAX submission
 *  - RSVP form AJAX submission
 *
 * Config.js and Swiper must be loaded first.
 */

(function () {
  "use strict";

  // =========================================================================
  // CONSTANTS
  // =========================================================================

  // Time durations (milliseconds)
  var MS_PER_DAY = 86400000;
  var MS_PER_HOUR = 3600000;
  var MS_PER_MIN = 60000;
  var MS_PER_SEC = 1000;

  // UI timing
  var PRELOADER_HIDE_DELAY = 800; // ms after load before starting fade
  var PRELOADER_FADE_DURATION = 400; // ms CSS fade duration + cleanup
  var ERROR_MSG_TTL = 5000; // ms before error message auto-removes

  // Gallery Swiper
  var GALLERY_AUTOPLAY_DELAY = 3000; // ms between vertical carousel slides
  var GALLERY_SCROLL_SPEED = 8000; // ms for one horizontal filmstrip pass
  var GALLERY_RELAYOUT_DELAY = 180; // debounce window for viewport/layout changes
  var GALLERY_INITIAL_EAGER_LOAD = 4; // number of slides to load immediately per track
  var GALLERY_VERTICAL_PRELOAD_RADIUS = 2; // active +/- slides to hydrate
  var GALLERY_HORIZONTAL_PRELOAD_RADIUS = 6; // active +/- slides to hydrate
  var GALLERY_MOBILE_MAX_WIDTH = 767;
  var GALLERY_MOBILE_PRELOAD_RADIUS = 3;
  var GALLERY_MOBILE_SCROLL_SPEED = 14000;
  var TIMELINE_MOBILE_MAX_WIDTH = 767;
  var TIMELINE_EDGE_TOLERANCE_PX = 1;
  var TIMELINE_TIME_MAX_LINES = 1;
  var TIMELINE_EVENT_MAX_LINES = 2;
  var SECTION_BG_PRELOAD_MARGIN = "240px 0px";
  var SECTION_BG_MOBILE_MAX_WIDTH = 767;
  var SECTION_BG_TABLET_MAX_WIDTH = 1024;
  var SECTION_BG_RESPONSIVE_VARIANTS = [
    { maxWidth: 480, suffix: "480" },
    { maxWidth: 640, suffix: "640" },
    { maxWidth: SECTION_BG_MOBILE_MAX_WIDTH, suffix: "768" },
    { maxWidth: SECTION_BG_TABLET_MAX_WIDTH, suffix: "768" },
    { maxWidth: 1600, suffix: "1280" },
  ];

  // Ambient audio
  var AMBIENT_AUDIO_SRC_COVER = "assets/audio/ocean_waves_sound.mp3";
  var AMBIENT_AUDIO_SRC_AFTER_COVER =
    (WEDDING_CONFIG.audio && WEDDING_CONFIG.audio.afterCoverSrc) ||
    "assets/audio/kiki_light.mp3";
  var AMBIENT_AUDIO_VOLUME = 0.08;
  var GESTURE_RETRY_EVENTS = ["pointerdown", "touchstart", "keydown"];
  var AMBIENT_AUDIO_CONSENT_SELECTOR = "#ambient-audio-consent";
  var COVER_VIDEO_FAIL_TIMEOUT = 12000;
  var DEBUG_CONFIG = WEDDING_CONFIG.debug || {};
  var COVER_VIDEO_TELEMETRY_ENABLED = !!DEBUG_CONFIG.coverVideoTelemetry;
  var COVER_VIDEO_TELEMETRY_ENDPOINT =
    typeof DEBUG_CONFIG.coverVideoTelemetryEndpoint === "string" &&
    DEBUG_CONFIG.coverVideoTelemetryEndpoint.trim() !== ""
      ? DEBUG_CONFIG.coverVideoTelemetryEndpoint
      : "/api/video-debug";
  var COVER_VIDEO_TELEMETRY_MAX_EVENTS = Number.isFinite(
    DEBUG_CONFIG.coverVideoTelemetryMaxEvents,
  )
    ? Math.max(1, Math.floor(DEBUG_CONFIG.coverVideoTelemetryMaxEvents))
    : 12;
  var FORCE_TEXT_ANIMATIONS_WITH_REDUCED_MOTION =
    !!DEBUG_CONFIG.forceTextAnimationsWithReducedMotion;
  var FORCE_MOTION_TEXT_CLASS = "force-motion-text";

  // Scroll animations
  var SCROLL_ANIM_THRESHOLD = 0; // trigger as soon as target crosses reveal line
  var THANK_YOU_MESSAGE_DELAY = 300; // ms after thank-you heading reveal
  var THANK_YOU_CREDIT_DELAY = 450; // ms after thank-you message reveal

  // Gallery swiper references (kept for relayout updates)
  var galleryVerticalSwiper = null;
  var galleryHorizontalSwiper = null;
  var galleryRelayoutTimer = null;
  var galleryRelayoutRaf = null;

  var OPTIMIZED_SECTION_IMAGES = {
    "assets/images/ocean_waves_background.png":
      "assets/images/optimized/sections/ocean_waves_background.jpg",
    "assets/images/hon_dau_resort.jpg":
      "assets/images/optimized/sections/hon_dau_resort.jpg",
    "assets/images/phuc_van_pics/phuc_van_1/Album 30 x 30 Phuc Van/HL.jpg":
      "assets/images/optimized/sections/until_the_day.jpg",
    "assets/images/phuc_van_pics/phuc_van_1/DSC_6293.jpg":
      "assets/images/optimized/sections/save_the_date.jpg",
    "assets/images/phuc_van_pics/phuc_van_1/BRS06403.jpg":
      "assets/images/optimized/sections/wishes.jpg",
    "assets/images/phuc_van_pics/phuc_van_1/Album 30 x 30 Phuc Van/G.jpg":
      "assets/images/optimized/sections/thank_you.jpg",
  };

  var DEFAULT_SECTION_BG_STYLE = {
    size: "cover",
    position: "center center",
    repeat: "no-repeat",
  };

  // =========================================================================
  // REGION 1: HELPERS
  // =========================================================================

  function setText(selector, text, parent) {
    var el = (parent || document).querySelector(selector);
    if (el) el.textContent = text;
  }

  function setAttr(selector, attr, value, parent) {
    var el = (parent || document).querySelector(selector);
    if (el) el.setAttribute(attr, value);
  }

  function normalizeToJpgPath(filePath) {
    return String(filePath).replace(/\.[^./]+$/, ".jpg");
  }

  function buildJpgVariantPath(basePath, suffix) {
    if (typeof basePath !== "string" || !basePath) return basePath;
    return basePath.replace(/\.jpg$/i, "-" + suffix + ".jpg");
  }

  function getViewportWidth() {
    if (window.visualViewport && window.visualViewport.width) {
      return window.visualViewport.width;
    }
    return window.innerWidth || document.documentElement.clientWidth || 0;
  }

  function toOptimizedImagePath(imagePath) {
    if (typeof imagePath !== "string" || imagePath.trim() === "") {
      return imagePath;
    }

    if (OPTIMIZED_SECTION_IMAGES[imagePath]) {
      return OPTIMIZED_SECTION_IMAGES[imagePath];
    }

    if (imagePath.indexOf("assets/images/gallery/portrait/") === 0) {
      return normalizeToJpgPath(
        imagePath.replace(
          "assets/images/gallery/portrait/",
          "assets/images/optimized/gallery/portrait/",
        ),
      );
    }

    if (imagePath.indexOf("assets/images/gallery/landscape/") === 0) {
      return normalizeToJpgPath(
        imagePath.replace(
          "assets/images/gallery/landscape/",
          "assets/images/optimized/gallery/landscape/",
        ),
      );
    }

    return imagePath;
  }

  function getResponsiveSectionImagePath(basePath) {
    if (typeof basePath !== "string" || !basePath) return basePath;
    if (basePath.indexOf("assets/images/optimized/sections/") !== 0) {
      return basePath;
    }

    var viewportWidth = getViewportWidth();
    var devicePixelRatio = window.devicePixelRatio || 1;
    var effectiveWidth = viewportWidth * devicePixelRatio;

    for (var i = 0; i < SECTION_BG_RESPONSIVE_VARIANTS.length; i++) {
      var variant = SECTION_BG_RESPONSIVE_VARIANTS[i];
      if (effectiveWidth > 0 && effectiveWidth <= variant.maxWidth) {
        return buildJpgVariantPath(basePath, variant.suffix);
      }
    }

    return basePath;
  }

  function getGalleryResponsiveAttrs(basePath, pool) {
    if (pool === "horizontal") {
      return {
        srcset:
          buildJpgVariantPath(basePath, "640") +
          " 640w, " +
          buildJpgVariantPath(basePath, "960") +
          " 960w, " +
          buildJpgVariantPath(basePath, "1280") +
          " 1280w",
        sizes: "(max-width: 767px) 86vw, 520px",
      };
    }

    return {
      srcset:
        buildJpgVariantPath(basePath, "480") +
        " 480w, " +
        buildJpgVariantPath(basePath, "768") +
        " 768w, " +
        buildJpgVariantPath(basePath, "960") +
        " 960w",
      sizes: "(max-width: 767px) 74vw, 416px",
    };
  }

  /** Read a CSS custom property as px number, with numeric fallback. */
  function getCssPixelVar(varName, fallbackPx) {
    var raw = getComputedStyle(document.documentElement)
      .getPropertyValue(varName)
      .trim();
    var value = parseFloat(raw);
    return Number.isFinite(value) ? value : fallbackPx;
  }

  function registerDocumentListeners(events, handler) {
    events.forEach(function (evt) {
      document.addEventListener(evt, handler);
    });
  }

  function unregisterDocumentListeners(events, handler) {
    events.forEach(function (evt) {
      document.removeEventListener(evt, handler);
    });
  }

  function getPrefersReducedMotion() {
    return !!(
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function applyReducedMotionTextOverrideClass() {
    if (!document.body) return;
    if (FORCE_TEXT_ANIMATIONS_WITH_REDUCED_MOTION && getPrefersReducedMotion()) {
      document.body.classList.add(FORCE_MOTION_TEXT_CLASS);
    } else {
      document.body.classList.remove(FORCE_MOTION_TEXT_CLASS);
    }
  }

  function getMediaErrorCodeName(code) {
    var map = {
      1: "MEDIA_ERR_ABORTED",
      2: "MEDIA_ERR_NETWORK",
      3: "MEDIA_ERR_DECODE",
      4: "MEDIA_ERR_SRC_NOT_SUPPORTED",
    };
    return map[code] || "UNKNOWN";
  }

  function getConnectionSnapshot() {
    var conn =
      navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn) return null;
    return {
      effectiveType: conn.effectiveType || "",
      downlink: Number.isFinite(conn.downlink) ? conn.downlink : null,
      rtt: Number.isFinite(conn.rtt) ? conn.rtt : null,
      saveData: !!conn.saveData,
    };
  }

  function getCoverVideoState(video) {
    var err = video && video.error ? video.error : null;
    return {
      currentSrc: (video && video.currentSrc) || "",
      networkState: video ? video.networkState : null,
      readyState: video ? video.readyState : null,
      paused: video ? video.paused : null,
      muted: video ? video.muted : null,
      ended: video ? video.ended : null,
      errorCode: err ? err.code : null,
      errorName: err ? getMediaErrorCodeName(err.code) : "",
      errorMessage: err && err.message ? err.message : "",
    };
  }

  function createCoverVideoDebugLogger(video, sources, extraContext) {
    if (!COVER_VIDEO_TELEMETRY_ENABLED) {
      return function () {};
    }

    var sent = 0;
    var sessionId = Math.random().toString(36).slice(2, 12);
    var sourceList = Array.isArray(sources)
      ? sources.map(function (s) {
          return { src: s.src || "", type: s.type || "" };
        })
      : [];

    function send(eventName, detail) {
      if (sent >= COVER_VIDEO_TELEMETRY_MAX_EVENTS) return;
      sent += 1;

      var payload = {
        event: eventName,
        timestamp: new Date().toISOString(),
        sessionId: sessionId,
        href: window.location.href,
        userAgent: navigator.userAgent,
        platform: navigator.platform || "",
        language: navigator.language || "",
        online: typeof navigator.onLine === "boolean" ? navigator.onLine : true,
        viewport: {
          width: window.innerWidth || null,
          height: window.innerHeight || null,
        },
        dpr: window.devicePixelRatio || 1,
        visibilityState: document.visibilityState || "",
        connection: getConnectionSnapshot(),
        detail: {
          video: getCoverVideoState(video),
          sources: sourceList,
          context: extraContext || {},
          extra: detail || {},
        },
      };

      var body = JSON.stringify(payload);

      try {
        if (navigator.sendBeacon) {
          var blob = new Blob([body], { type: "application/json" });
          navigator.sendBeacon(COVER_VIDEO_TELEMETRY_ENDPOINT, blob);
          return;
        }
      } catch (e) {}

      try {
        fetch(COVER_VIDEO_TELEMETRY_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: body,
          keepalive: true,
        }).catch(function () {});
      } catch (e) {}
    }

    return send;
  }

  function getConfiguredWeddingDate() {
    var parsed = new Date(WEDDING_CONFIG.weddingDate);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  }

  function formatDateAsNumericVi(date) {
    var day = String(date.getDate()).padStart(2, "0");
    var month = String(date.getMonth() + 1).padStart(2, "0");
    var year = date.getFullYear();
    return day + "-" + month + "-" + year;
  }

  function formatDateAsLongVi(date) {
    var weekdays = [
      "Chủ nhật",
      "Thứ 2",
      "Thứ 3",
      "Thứ 4",
      "Thứ 5",
      "Thứ 6",
      "Thứ 7",
    ];
    var weekday = weekdays[date.getDay()] || "";
    var day = String(date.getDate()).padStart(2, "0");
    var month = date.getMonth() + 1;
    return weekday + ", " + day + " Tháng " + month;
  }

  function formatDateForDateTimeAttr(date) {
    var year = date.getFullYear();
    var month = String(date.getMonth() + 1).padStart(2, "0");
    var day = String(date.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
  }

  /** Bulk-set textContent from a { selector: text } map. */
  function populateText(mapping, parent) {
    var root = parent || document;
    var selectors = Object.keys(mapping);
    for (var i = 0; i < selectors.length; i++) {
      var el = root.querySelector(selectors[i]);
      if (el) el.textContent = mapping[selectors[i]];
    }
  }

  /** Bulk-set attributes from a { selector: { attr: value, ... } } map. */
  function populateAttrs(mapping, parent) {
    var root = parent || document;
    var selectors = Object.keys(mapping);
    for (var i = 0; i < selectors.length; i++) {
      var el = root.querySelector(selectors[i]);
      if (!el) continue;
      var attrs = mapping[selectors[i]];
      var keys = Object.keys(attrs);
      for (var j = 0; j < keys.length; j++) {
        el.setAttribute(keys[j], attrs[keys[j]]);
      }
    }
  }

  /** Append configured Remix icons below section titles. */
  function applyHeadingIcons() {
    var iconMap = WEDDING_CONFIG.headingIcons || {};
    var selectors = Object.keys(iconMap);
    if (!selectors.length) return;

    selectors.forEach(function (selector) {
      var iconClass = iconMap[selector];
      if (!iconClass) return;

      var elements = document.querySelectorAll(selector);
      elements.forEach(function (el) {
        if (!el) return;

        var hasVisibleText = (el.textContent || "").trim() !== "";
        if (!hasVisibleText) return;

        var firstChild = el.firstElementChild;
        if (
          firstChild &&
          firstChild.classList.contains("section-heading-icon-wrap")
        ) {
          return;
        }

        var iconWrap = document.createElement("span");
        iconWrap.className = "section-heading-icon-wrap";
        iconWrap.setAttribute("aria-hidden", "true");

        var icon = document.createElement("i");
        icon.className = "section-heading-icon " + iconClass;

        iconWrap.appendChild(icon);
        el.appendChild(iconWrap);
        el.classList.add("section-heading-with-icon");
      });
    });
  }

  /** Set background-image on a section element by ID. */
  function setSectionBackground(sectionId, imageUrl) {
    if (!imageUrl) return;
    var section = document.getElementById(sectionId);
    if (!section) return;

    section.setAttribute("data-bg-src", toOptimizedImagePath(imageUrl));
    applySectionBackgroundStyle(section, getSectionBackgroundStyle(sectionId));
  }

  function sanitizeBackgroundStyleValue(value, fallback) {
    if (typeof value !== "string") return fallback;
    var trimmed = value.trim();
    return trimmed !== "" ? trimmed : fallback;
  }

  function getSectionBackgroundStyle(sectionId) {
    var styleMap = WEDDING_CONFIG.sectionBackgrounds || {};
    var sectionStyle = styleMap[sectionId] || {};

    return {
      size: sanitizeBackgroundStyleValue(
        sectionStyle.size,
        DEFAULT_SECTION_BG_STYLE.size,
      ),
      position: sanitizeBackgroundStyleValue(
        sectionStyle.position,
        DEFAULT_SECTION_BG_STYLE.position,
      ),
      repeat: sanitizeBackgroundStyleValue(
        sectionStyle.repeat,
        DEFAULT_SECTION_BG_STYLE.repeat,
      ),
    };
  }

  function applySectionBackgroundStyle(section, styleConfig) {
    if (!section || !styleConfig) return;

    section.style.backgroundSize = styleConfig.size;
    section.style.backgroundPosition = styleConfig.position;
    section.style.backgroundRepeat = styleConfig.repeat;

    // Keep applied values visible in DevTools for quick diagnostics.
    section.setAttribute("data-bg-size", styleConfig.size);
    section.setAttribute("data-bg-position", styleConfig.position);
    section.setAttribute("data-bg-repeat", styleConfig.repeat);
  }

  function applySectionBackgroundImage(section, preferredSrc) {
    if (!section || !preferredSrc) return;
    section.style.backgroundImage = "url('" + preferredSrc + "')";
  }

  function hydrateSectionBackground(section) {
    if (!section) return;
    if (section.getAttribute("data-bg-loaded") === "true") return;

    var basePreferredSrc = section.getAttribute("data-bg-src");
    var preferredSrc = getResponsiveSectionImagePath(basePreferredSrc);
    if (!preferredSrc) return;

    applySectionBackgroundImage(section, preferredSrc);
    section.setAttribute("data-bg-loaded", "true");
  }

  function initDeferredSectionBackgrounds() {
    var sections = document.querySelectorAll("[data-bg-src]");
    if (!sections.length) return;

    if (!("IntersectionObserver" in window)) {
      sections.forEach(function (section) {
        hydrateSectionBackground(section);
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          hydrateSectionBackground(entry.target);
          observer.unobserve(entry.target);
        });
      },
      {
        root: null,
        threshold: 0.01,
        rootMargin: SECTION_BG_PRELOAD_MARGIN,
      },
    );

    sections.forEach(function (section) {
      observer.observe(section);
    });
  }

  function getFirstNonEmptyTrimmed(values) {
    for (var i = 0; i < values.length; i++) {
      var value = values[i];
      if (typeof value === "string" && value.trim() !== "") return value.trim();
    }
    return "";
  }

  function extractFamilyPartsFromGiftSubtitle(subtitleHtml, role) {
    if (!subtitleHtml)
      return { fatherName: "", motherName: "", personName: "" };

    var wrapper = document.createElement("div");
    var htmlWithBreaks = String(subtitleHtml).replace(/<br\s*\/?>/gi, "\n");
    wrapper.innerHTML = htmlWithBreaks;

    var text = (wrapper.textContent || wrapper.innerText || "")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!text) return { fatherName: "", motherName: "", personName: "" };

    var parentLine = text.split(/(?=(?:Chú rể|Cô dâu)\s*:)/i)[0].trim();
    var parentParts = parentLine
      .split(/\s*-\s*/)
      .map(function (part) {
        return part.trim();
      })
      .filter(Boolean);
    var roleRegex =
      role === "groom" ? /Chú rể\s*:\s*([^\n(]+)/i : /Cô dâu\s*:\s*([^\n(]+)/i;
    var personMatch =
      text.match(roleRegex) || text.match(/(?:Chú rể|Cô dâu)\s*:\s*([^\n(]+)/i);

    return {
      fatherName: parentParts[0] || "",
      motherName: parentParts[1] || "",
      personName: personMatch ? personMatch[1].trim() : "",
    };
  }

  function getGiftCtaText(subtitleHtml) {
    var fallback = "(Bấm vào đây để gửi quà)";
    if (!subtitleHtml) return fallback;

    var wrapper = document.createElement("div");
    wrapper.innerHTML = String(subtitleHtml);

    var ctaEl = wrapper.querySelector(".gifts__card-cta");
    if (ctaEl && ctaEl.textContent) {
      var ctaText = ctaEl.textContent.trim();
      if (ctaText) return ctaText;
    }

    var text = (wrapper.textContent || wrapper.innerText || "")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    var ctaMatch = text.match(/\(Bấm vào đây để gửi quà\)/i);
    return ctaMatch ? ctaMatch[0] : fallback;
  }

  function getElementLineHeight(el) {
    var styles = window.getComputedStyle(el);
    var lineHeight = parseFloat(styles.lineHeight);
    if (Number.isFinite(lineHeight)) return lineHeight;
    var fontSize = parseFloat(styles.fontSize);
    return Number.isFinite(fontSize) ? fontSize * 1.2 : 20;
  }

  function getElementLineCount(el) {
    if (!el) return 0;
    var lineHeight = getElementLineHeight(el);
    if (!lineHeight) return 0;
    return Math.max(
      1,
      Math.round(el.getBoundingClientRect().height / lineHeight),
    );
  }

  function syncFamilyNameLineCounts() {
    var groomName = document.querySelector(".family__name--groom");
    var brideName = document.querySelector(".family__name--bride");
    if (!groomName || !brideName) return;

    [groomName, brideName].forEach(function (el) {
      el.style.removeProperty("font-size");
      el.style.removeProperty("max-width");
    });

    var groomLines = getElementLineCount(groomName);
    var brideLines = getElementLineCount(brideName);
    var targetLines = Math.max(groomLines, brideLines);

    function tightenUntilMatches(el) {
      var steps = 0;
      var maxWidthPercent = 100;
      var currentLines = getElementLineCount(el);

      while (currentLines < targetLines && steps < 80 && maxWidthPercent > 64) {
        steps += 1;
        maxWidthPercent -= 2;
        el.style.maxWidth = maxWidthPercent + "%";

        currentLines = getElementLineCount(el);
      }
    }

    if (groomLines < targetLines) tightenUntilMatches(groomName);
    if (brideLines < targetLines) tightenUntilMatches(brideName);

    // Safety pass for rounding differences after iterative constraints.
    groomLines = getElementLineCount(groomName);
    brideLines = getElementLineCount(brideName);
    targetLines = Math.max(groomLines, brideLines);
    if (groomLines < targetLines) tightenUntilMatches(groomName);
    if (brideLines < targetLines) tightenUntilMatches(brideName);
  }

  function initFamilyNameLineSync() {
    var scheduled = false;

    function runSync() {
      scheduled = false;
      syncFamilyNameLineCounts();
    }

    function scheduleSync() {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(runSync);
    }

    window.addEventListener("resize", scheduleSync);
    window.addEventListener("orientationchange", scheduleSync);

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(scheduleSync).catch(function () {});
    }

    scheduleSync();
    window.setTimeout(scheduleSync, 120);
  }

  function isMobileViewport(maxWidth) {
    if (window.matchMedia) {
      return window.matchMedia("(max-width: " + maxWidth + "px)").matches;
    }
    return getViewportWidth() <= maxWidth;
  }

  function isElementTouchingViewportEdge(el, tolerancePx) {
    if (!el) return false;
    var rect = el.getBoundingClientRect();
    var tolerance = Number.isFinite(tolerancePx) ? Math.max(0, tolerancePx) : 0;
    var viewportWidth = getViewportWidth();
    if (!viewportWidth) return false;

    return rect.left <= tolerance || rect.right >= viewportWidth - tolerance;
  }

  function resetTimelineFitClasses(timelineSection) {
    if (!timelineSection) return;
    timelineSection.classList.remove("timeline--text-fallback");
    timelineSection.classList.remove("timeline--text-lock");
  }

  function getTimelineTextFitStatus(timelineSection) {
    var times = timelineSection.querySelectorAll(".timeline__time");
    var events = timelineSection.querySelectorAll(".timeline__event");
    var hasEdgeTouch = false;
    var hasTimeWrap = false;
    var hasEventOverTwoLines = false;

    times.forEach(function (timeEl) {
      if (isElementTouchingViewportEdge(timeEl, TIMELINE_EDGE_TOLERANCE_PX)) {
        hasEdgeTouch = true;
      }
      if (getElementLineCount(timeEl) > TIMELINE_TIME_MAX_LINES) {
        hasTimeWrap = true;
      }
    });

    events.forEach(function (eventEl) {
      if (isElementTouchingViewportEdge(eventEl, TIMELINE_EDGE_TOLERANCE_PX)) {
        hasEdgeTouch = true;
      }
      if (getElementLineCount(eventEl) > TIMELINE_EVENT_MAX_LINES) {
        hasEventOverTwoLines = true;
      }
    });

    return {
      needsFallback: hasEdgeTouch || hasTimeWrap || hasEventOverTwoLines,
      hasEdgeTouch: hasEdgeTouch,
      hasTimeWrap: hasTimeWrap,
      hasEventOverTwoLines: hasEventOverTwoLines,
    };
  }

  function applyTimelineMobileTextFit() {
    var timelineSection = document.getElementById("timeline");
    if (!timelineSection) return;

    resetTimelineFitClasses(timelineSection);

    if (!isMobileViewport(TIMELINE_MOBILE_MAX_WIDTH)) {
      return;
    }

    var status = getTimelineTextFitStatus(timelineSection);
    if (!status.needsFallback) return;

    timelineSection.classList.add("timeline--text-fallback");

    status = getTimelineTextFitStatus(timelineSection);
    if (status.needsFallback) {
      timelineSection.classList.add("timeline--text-lock");
    }
  }

  function initTimelineMobileTextFit() {
    var scheduled = false;

    function runFit() {
      scheduled = false;
      applyTimelineMobileTextFit();
    }

    function scheduleFit() {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(runFit);
    }

    window.addEventListener("resize", scheduleFit);
    window.addEventListener("orientationchange", scheduleFit);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", scheduleFit);
    }

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(scheduleFit).catch(function () {});
    }

    scheduleFit();
    window.setTimeout(scheduleFit, 120);
  }

  /** Submit a JSON payload to the API; calls onSuccess or onError. */
  function submitFormToApi(api, payload, onSuccess, onError) {
    fetch(api.baseUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    })
      .then(function (res) {
        return res.json();
      })
      .then(onSuccess)
      .catch(onError);
  }

  function submitFormWithFallback(options) {
    var submitBtn = options.submitBtn;
    if (submitBtn && options.submittingText) {
      submitBtn.textContent = options.submittingText;
    }

    if (options.api && options.api.baseUrl) {
      submitFormToApi(
        options.api,
        options.payload,
        options.onSuccess,
        function () {
          if (typeof options.onError === "function") options.onError();
          if (submitBtn && options.submitText)
            submitBtn.textContent = options.submitText;
        },
      );
      return;
    }

    options.onSuccess();
  }

  /** Show a temporary message inside a form. */
  function showFormMessage(form, text, type) {
    var existing = form.querySelector(".form-message");
    if (existing) existing.remove();

    var msg = document.createElement("p");
    msg.className = "form-message form-message--" + type;
    msg.textContent = text;
    form.appendChild(msg);

    if (type === "error") {
      setTimeout(function () {
        msg.remove();
      }, ERROR_MSG_TTL);
    }
  }

  /** Show a persistent section-level success confirmation below a heading. */
  function showSectionSuccess(section, heading, text) {
    if (!section || !heading) return;

    var existing = section.querySelector(".section-success");
    if (existing) {
      setText(".section-success__text", text, existing);
      return;
    }

    var confirmation = document.createElement("div");
    confirmation.className = "section-success";
    confirmation.innerHTML = '<p class="section-success__text"></p>';
    setText(".section-success__text", text, confirmation);

    var insertBefore = heading.nextElementSibling;
    if (insertBefore) {
      section.insertBefore(confirmation, insertBefore);
    } else {
      section.appendChild(confirmation);
    }
  }

  // =========================================================================
  // REGION 2: POPULATE FUNCTIONS (config -> DOM)
  // =========================================================================

  function populateMeta() {
    var meta = WEDDING_CONFIG.meta;
    document.title = meta.title;
    setAttr('meta[name="description"]', "content", meta.description);
  }

  function populateCover() {
    var cover = WEDDING_CONFIG.cover;
    var coverGroomName = cover.groomName || "";
    var coverBrideName = cover.brideName || "";
    var coverLocationLine1 = cover.locationLine1 || "";
    var coverLocationLine2 = cover.locationLine2 || "";
    var coverLocationText = "";

    if (coverLocationLine1 && coverLocationLine2) {
      coverLocationText = coverLocationLine1 + "\n" + coverLocationLine2;
    } else {
      coverLocationText =
        cover.locationLine || coverLocationLine1 || coverLocationLine2 || "";
    }

    var coverSection = document.getElementById("cover");
    var coverVideo = document.querySelector(".cover__video");
    var coverBg = document.querySelector(".cover__bg--fallback");
    var coverBgSrc = getResponsiveSectionImagePath(
      toOptimizedImagePath(cover.backgroundImage || ""),
    );
    if (coverBg && coverBgSrc) {
      coverBg.style.backgroundImage = "url('" + coverBgSrc + "')";
    } else if (coverBg) {
      coverBg.style.removeProperty("background-image");
    }

    var configuredWeddingDate = getConfiguredWeddingDate();
    var coverDateText = configuredWeddingDate
      ? formatDateAsNumericVi(configuredWeddingDate)
      : "";

    populateText({
      ".cover__groom-name": coverGroomName,
      ".cover__bride-name": coverBrideName,
      ".cover__date": coverDateText.toUpperCase(),
      ".cover__venue": coverLocationText.toUpperCase(),
    });

    if (!coverSection || !coverVideo) return;

    coverSection.classList.remove("cover--video-ready");
    coverSection.classList.remove("cover--video-unavailable");
    coverSection.classList.remove("cover--has-video-src");
    coverSection.classList.remove("cover--no-fallback-image");
    if (!cover.backgroundImage) {
      coverSection.classList.add("cover--no-fallback-image");
    }

    // Keep playback settings explicit for cross-browser consistency.
    coverVideo.preload = "auto";
    coverVideo.muted = true;
    coverVideo.defaultMuted = true;
    coverVideo.loop = true;
    coverVideo.playsInline = true;
    coverVideo.setAttribute("playsinline", "");
    coverVideo.setAttribute("webkit-playsinline", "");

    var poster = getResponsiveSectionImagePath(
      toOptimizedImagePath(cover.posterImage || cover.backgroundImage || ""),
    );
    if (poster) {
      coverVideo.poster = poster;
    }

    var prefersReducedMotion = getPrefersReducedMotion();
    var forceVideoWithReducedMotion = !!cover.forceVideoWithReducedMotion;
    var shouldRespectReducedMotionForVideo =
      prefersReducedMotion && !forceVideoWithReducedMotion;

    var configuredSources = [];
    if (Array.isArray(cover.videoSources)) {
      configuredSources = cover.videoSources.slice();
    } else if (cover.videoUrl) {
      configuredSources = [{ src: cover.videoUrl, type: "video/mp4" }];
    }

    var usableSources = configuredSources.filter(function (source) {
      return (
        source && typeof source.src === "string" && source.src.trim() !== ""
      );
    });
    var coverDebugLog = createCoverVideoDebugLogger(coverVideo, usableSources, {
      prefersReducedMotion: prefersReducedMotion,
      forceVideoWithReducedMotion: forceVideoWithReducedMotion,
      forceTextAnimationsWithReducedMotion:
        FORCE_TEXT_ANIMATIONS_WITH_REDUCED_MOTION,
      shouldRespectReducedMotionForVideo: shouldRespectReducedMotionForVideo,
      failTimeoutMs: COVER_VIDEO_FAIL_TIMEOUT,
      preload: coverVideo.preload,
    });
    coverDebugLog("cover_video_init");

    if (!usableSources.length) {
      coverDebugLog("cover_video_no_usable_sources");
      coverSection.classList.add("cover--video-unavailable");
      return;
    }

    if (typeof coverVideo.canPlayType === "function") {
      var playableSources = usableSources.filter(function (source) {
        if (!source.type) return true;
        var support = coverVideo.canPlayType(source.type);
        return support === "probably" || support === "maybe";
      });
      if (playableSources.length) usableSources = playableSources;
    }
    coverDebugLog("cover_video_sources_selected", {
      selectedSourceCount: usableSources.length,
    });

    // Let the browser choose the best source from an ordered list.
    coverVideo.removeAttribute("src");
    while (coverVideo.firstChild) {
      coverVideo.removeChild(coverVideo.firstChild);
    }
    usableSources.forEach(function (source) {
      var sourceEl = document.createElement("source");
      sourceEl.src = source.src;
      if (source.type) sourceEl.type = source.type;
      coverVideo.appendChild(sourceEl);
    });
    coverSection.classList.add("cover--has-video-src");
    coverVideo.load();

    var playbackConfirmed = false;
    var retryAttached = false;
    var failureTimeoutId = null;
    var playbackFrameProbeActive = false;

    function clearFailureTimeout() {
      if (failureTimeoutId) {
        clearTimeout(failureTimeoutId);
        failureTimeoutId = null;
      }
    }

    function removeRetryListeners() {
      if (!retryAttached) return;
      unregisterDocumentListeners(GESTURE_RETRY_EVENTS, onFirstGesture);
      retryAttached = false;
    }

    function addRetryListeners() {
      if (retryAttached || shouldRespectReducedMotionForVideo) return;
      registerDocumentListeners(GESTURE_RETRY_EVENTS, onFirstGesture);
      retryAttached = true;
    }

    function setUnavailable(reason) {
      clearFailureTimeout();
      removeRetryListeners();
      playbackFrameProbeActive = false;
      coverSection.classList.remove("cover--video-ready");
      coverSection.classList.remove("cover--video-timeout");
      coverSection.classList.remove("cover--has-video-src");
      coverSection.classList.add("cover--video-unavailable");
      coverDebugLog("cover_video_unavailable", {
        reason: reason || "unknown",
      });
    }

    function confirmPlaybackFromState(trigger) {
      if (playbackConfirmed) return true;
      if (!coverVideo.paused && coverVideo.currentTime > 0) {
        onPlaybackStarted(trigger || "state_confirmed");
        return true;
      }
      return false;
    }

    function probePlaybackByFrame() {
      if (playbackConfirmed || playbackFrameProbeActive) return;
      if (typeof coverVideo.requestVideoFrameCallback !== "function") return;
      playbackFrameProbeActive = true;
      try {
        coverVideo.requestVideoFrameCallback(function () {
          playbackFrameProbeActive = false;
          if (playbackConfirmed) return;
          if (!confirmPlaybackFromState("video_frame_callback")) {
            addRetryListeners();
            scheduleFailureFallback();
          }
        });
      } catch (e) {
        playbackFrameProbeActive = false;
      }
    }

    function onPlaybackStarted(trigger) {
      if (playbackConfirmed) return;
      playbackConfirmed = true;
      playbackFrameProbeActive = false;
      clearFailureTimeout();
      removeRetryListeners();
      coverSection.classList.remove("cover--video-unavailable");
      coverSection.classList.remove("cover--video-timeout");
      coverSection.classList.add("cover--video-ready");
      coverDebugLog("cover_video_playback_started", {
        trigger: trigger || "unknown",
      });
    }

    function scheduleFailureFallback() {
      clearFailureTimeout();
      failureTimeoutId = setTimeout(function () {
        if (!playbackConfirmed) {
          coverSection.classList.add("cover--video-timeout");
          coverDebugLog("cover_video_timeout_soft_fallback", {
            paused: coverVideo.paused,
            currentTime: coverVideo.currentTime,
            readyState: coverVideo.readyState,
            networkState: coverVideo.networkState,
          });
          addRetryListeners();
        }
      }, COVER_VIDEO_FAIL_TIMEOUT);
    }

    function attemptPlay(trigger) {
      if (shouldRespectReducedMotionForVideo) return;
      coverDebugLog("cover_video_play_attempt", {
        trigger: trigger || "unknown",
        afterTimeout: coverSection.classList.contains("cover--video-timeout"),
      });
      var playAttempt;
      try {
        playAttempt = coverVideo.play();
      } catch (e) {
        coverDebugLog("cover_video_play_exception", {
          trigger: trigger || "unknown",
          message: e && e.message ? e.message : "",
        });
        addRetryListeners();
        scheduleFailureFallback();
        return;
      }

      // Older engines may not return a Promise from play().
      if (!playAttempt || typeof playAttempt.then !== "function") {
        coverDebugLog("cover_video_non_promise_play");
        if (!confirmPlaybackFromState("non_promise_state_confirmed")) {
          addRetryListeners();
          scheduleFailureFallback();
          probePlaybackByFrame();
        }
        return;
      }

      playAttempt
        .then(function () {
          if (!confirmPlaybackFromState("play_promise_resolved")) {
            coverDebugLog("cover_video_play_promise_pending");
            addRetryListeners();
            scheduleFailureFallback();
            probePlaybackByFrame();
          }
        })
        .catch(function (err) {
          coverDebugLog("cover_video_play_rejected", {
            trigger: trigger || "unknown",
            message: err && err.message ? err.message : "",
            name: err && err.name ? err.name : "",
          });
          addRetryListeners();
          scheduleFailureFallback();
        });
    }

    function onFirstGesture() {
      coverDebugLog("cover_video_first_gesture_retry", {
        afterTimeout: coverSection.classList.contains("cover--video-timeout"),
        playbackConfirmed: playbackConfirmed,
      });
      attemptPlay("first_gesture");
    }

    coverVideo.addEventListener("loadedmetadata", function () {
      coverDebugLog("cover_video_loadedmetadata");
      scheduleFailureFallback();
    });
    coverVideo.addEventListener("canplay", function () {
      coverDebugLog("cover_video_canplay");
      attemptPlay("canplay_event");
    });
    coverVideo.addEventListener("playing", function () {
      onPlaybackStarted("playing_event");
    });
    coverVideo.addEventListener("timeupdate", function () {
      if (coverVideo.currentTime > 0 && !coverVideo.paused) {
        onPlaybackStarted("timeupdate_event");
      }
    });
    coverVideo.addEventListener("error", function () {
      coverDebugLog("cover_video_error");
      if (!playbackConfirmed) setUnavailable("error_event");
    });
    coverVideo.addEventListener("stalled", function () {
      coverDebugLog("cover_video_stalled");
      if (!playbackConfirmed) scheduleFailureFallback();
    });

    // Fallback in case a browser intermittently misses native loop behavior.
    coverVideo.addEventListener("ended", function () {
      try {
        coverVideo.currentTime = 0;
      } catch (e) {}
      coverDebugLog("cover_video_ended_restart");
      attemptPlay("ended_event");
    });

    if (!shouldRespectReducedMotionForVideo) {
      scheduleFailureFallback();
      attemptPlay("initial_boot");
    } else {
      setUnavailable("reduced_motion");
    }
  }

  function populateFamily() {
    var familySection = document.getElementById("family");
    if (!familySection) return;

    var familyCfg = WEDDING_CONFIG.family || {};
    var giftsCfg = WEDDING_CONFIG.gifts || {};
    var coverCfg = WEDDING_CONFIG.cover || {};

    var groomGiftFallback = extractFamilyPartsFromGiftSubtitle(
      giftsCfg.groom && giftsCfg.groom.subtitle,
      "groom",
    );
    var brideGiftFallback = extractFamilyPartsFromGiftSubtitle(
      giftsCfg.bride && giftsCfg.bride.subtitle,
      "bride",
    );

    var groomCfg = familyCfg.groom || {};
    var brideCfg = familyCfg.bride || {};

    var groomHouse = getFirstNonEmptyTrimmed([
      groomCfg.houseLabel,
      giftsCfg.groom && giftsCfg.groom.label,
      "Nhà Trai",
    ]);
    var brideHouse = getFirstNonEmptyTrimmed([
      brideCfg.houseLabel,
      giftsCfg.bride && giftsCfg.bride.label,
      "Nhà Gái",
    ]);

    var groomFatherName = getFirstNonEmptyTrimmed([
      groomCfg.fatherName,
      groomGiftFallback.fatherName,
    ]);
    var groomMotherName = getFirstNonEmptyTrimmed([
      groomCfg.motherName,
      groomGiftFallback.motherName,
    ]);
    var brideFatherName = getFirstNonEmptyTrimmed([
      brideCfg.fatherName,
      brideGiftFallback.fatherName,
    ]);
    var brideMotherName = getFirstNonEmptyTrimmed([
      brideCfg.motherName,
      brideGiftFallback.motherName,
    ]);

    var groomPersonName = getFirstNonEmptyTrimmed([
      groomCfg.personName,
      groomGiftFallback.personName,
      coverCfg.groomName,
    ]);
    var bridePersonName = getFirstNonEmptyTrimmed([
      brideCfg.personName,
      brideGiftFallback.personName,
      coverCfg.brideName,
    ]);

    populateText(
      {
        ".family__heading": getFirstNonEmptyTrimmed([
          familyCfg.heading,
          "Đám Cưới",
        ]),
        ".family__house-label--groom": groomHouse,
        ".family__house-label--bride": brideHouse,
        ".family__parent-line--groom-father": groomFatherName,
        ".family__parent-line--groom-mother": groomMotherName,
        ".family__parent-line--bride-father": brideFatherName,
        ".family__parent-line--bride-mother": brideMotherName,
        ".family__name--groom": groomPersonName,
        ".family__name--bride": bridePersonName,
        ".family__invite-title": getFirstNonEmptyTrimmed([
          familyCfg.inviteTitle,
          "Trân trọng kính mời",
        ]),
        ".family__invite-line": getFirstNonEmptyTrimmed([
          familyCfg.inviteLine,
          "Tham dự lễ thành hôn của chúng mình",
        ]),
        ".family__center-icon--top": getFirstNonEmptyTrimmed([
          familyCfg.topCenterSymbol,
          "♡",
        ]),
      },
      familySection,
    );
  }

  function populateUntilTheDay() {
    var cfg = WEDDING_CONFIG.untilTheDay;

    setSectionBackground("until-the-day", cfg.backgroundImage);
    setAttr(".until__timer", "data-wedding-date", WEDDING_CONFIG.weddingDate);

    populateText({
      ".until__heading": cfg.heading,
      ".until__message": cfg.message,
    });

    var items = document.querySelectorAll(".until__item");
    var labelKeys = ["days", "hours", "minutes", "seconds"];
    for (var i = 0; i < items.length; i++) {
      if (labelKeys[i])
        setText(".until__label", cfg.labels[labelKeys[i]], items[i]);
    }
  }

  function populateSaveTheDate() {
    var cfg = WEDDING_CONFIG.saveTheDate;
    var configuredWeddingDate = getConfiguredWeddingDate();
    var saveDateText = configuredWeddingDate
      ? formatDateAsLongVi(configuredWeddingDate)
      : "";

    setSectionBackground("save-the-date", cfg.backgroundImage);

    populateText({
      ".save-date__title": cfg.heading,
      ".save-date__date": saveDateText,
      ".save-date__time": cfg.timeLine,
    });

    if (configuredWeddingDate) {
      setAttr(
        ".save-date__date",
        "datetime",
        formatDateForDateTimeAttr(configuredWeddingDate),
      );
    }
  }

  function populateTimeline() {
    var cfg = WEDDING_CONFIG.timeline;

    populateText({
      ".timeline__subtitle": cfg.subtitle,
      ".timeline__heading": cfg.heading,
    });

    var track = document.querySelector(".timeline__track");
    if (!track) return;

    track.innerHTML = "";

    cfg.items.forEach(function (item) {
      var row = document.createElement("div");
      row.className = "timeline__item stagger-item";

      var entry = document.createElement("div");
      entry.className = "timeline__entry";

      var time = document.createElement("span");
      time.className = "timeline__time";
      time.textContent = item.time;

      var detail = document.createElement("div");
      detail.className = "timeline__detail";

      var iconWrap = document.createElement("div");
      iconWrap.className = "timeline__icon-wrap";

      var icon = document.createElement("img");
      icon.className = "timeline__icon";
      icon.src = item.iconSrc || "";
      icon.alt = item.iconAlt || item.label || "Biểu tượng sự kiện";
      icon.loading = "lazy";

      var event = document.createElement("span");
      event.className = "timeline__event";
      event.textContent = item.label;

      iconWrap.appendChild(icon);
      detail.appendChild(iconWrap);
      detail.appendChild(event);
      entry.appendChild(time);
      entry.appendChild(detail);
      row.appendChild(entry);
      track.appendChild(row);
    });
  }

  function populateGallery() {
    var cfg = WEDDING_CONFIG.gallery;

    setText(".gallery__title", cfg.title);
    var vImages = cfg.images;
    buildSlides(".gallery__slider .swiper-wrapper", vImages, "vertical");
    var hImages = cfg.horizontalImages || [];
    buildSlides(
      ".gallery__horizontal-slider .swiper-wrapper",
      hImages,
      "horizontal",
    );
  }

  function hydrateGalleryImage(img) {
    if (!img) return;
    var deferredSrc = img.getAttribute("data-src");
    if (!deferredSrc) return;

    var deferredSrcSet = img.getAttribute("data-srcset");
    var deferredSizes = img.getAttribute("data-sizes");
    if (deferredSrcSet) {
      img.srcset = deferredSrcSet;
      img.removeAttribute("data-srcset");
    }
    if (deferredSizes) {
      img.sizes = deferredSizes;
      img.removeAttribute("data-sizes");
    }

    img.src = deferredSrc;
    img.removeAttribute("data-src");
  }

  function hydrateSwiperNeighborhood(swiper, radius) {
    if (!swiper || !swiper.slides || !swiper.slides.length) return;
    var activeIndex = Number.isFinite(swiper.activeIndex)
      ? swiper.activeIndex
      : 0;
    var safeRadius = Number.isFinite(radius) ? Math.max(0, radius) : 0;

    for (var i = 0; i < swiper.slides.length; i++) {
      if (Math.abs(i - activeIndex) > safeRadius) continue;
      var imgs = swiper.slides[i].querySelectorAll(".gallery__img[data-src]");
      for (var j = 0; j < imgs.length; j++) {
        hydrateGalleryImage(imgs[j]);
      }
    }
  }

  function buildSlides(wrapperSelector, images, pool) {
    var wrapper = document.querySelector(wrapperSelector);
    if (!wrapper || !images.length) return;

    wrapper.innerHTML = "";
    images.forEach(function (image, index) {
      var slide = document.createElement("div");
      slide.className = "swiper-slide";
      var displaySrc = toOptimizedImagePath(image.src);
      var responsiveAttrs = getGalleryResponsiveAttrs(displaySrc, pool);

      var a = document.createElement("a");
      a.href = image.src;
      a.className = "gallery__link";
      a.setAttribute(
        "data-lightbox-index",
        index %
          ((pool === "horizontal"
            ? (WEDDING_CONFIG.gallery.horizontalImages || []).length
            : (WEDDING_CONFIG.gallery.images || []).length) || images.length),
      );
      a.setAttribute("data-lightbox-pool", pool);

      var img = document.createElement("img");
      if (index < GALLERY_INITIAL_EAGER_LOAD) {
        img.srcset = responsiveAttrs.srcset;
        img.sizes = responsiveAttrs.sizes;
        img.src = displaySrc;
      } else {
        img.setAttribute("data-srcset", responsiveAttrs.srcset);
        img.setAttribute("data-sizes", responsiveAttrs.sizes);
        img.setAttribute("data-src", displaySrc);
      }
      img.alt = image.alt;
      img.className = "gallery__img";
      img.loading = "lazy";
      img.decoding = "async";
      img.setAttribute("fetchpriority", index < 2 ? "high" : "low");

      a.appendChild(img);
      slide.appendChild(a);
      wrapper.appendChild(slide);
    });
  }

  function populateLocation() {
    var cfg = WEDDING_CONFIG.location;
    if (!cfg) return;

    setSectionBackground("location", cfg.backgroundImage);

    populateText({
      ".location__heading": cfg.heading,
      ".location__venue-name": cfg.venueName,
      ".location__venue-address": cfg.venueAddress,
    });

    setAttr(".location__map-iframe", "src", cfg.googleMapsEmbedUrl);

    var mapLink = document.querySelector(".location__map-link");
    if (mapLink) {
      mapLink.href = cfg.mapLinkHref;
      mapLink.textContent = cfg.mapLinkText;
    }
  }

  function populateWishes() {
    var cfg = WEDDING_CONFIG.wishes;

    setSectionBackground("wishes", cfg.backgroundImage);

    setText(".wishes__heading", cfg.heading);

    populateText({
      '.wishes__label[for="wish-name"]': cfg.nameLabel,
      '.wishes__label[for="wish-message"]': cfg.messageLabel,
      ".wishes__submit": cfg.submitText,
    });

    populateAttrs({
      "#wish-name": { placeholder: cfg.namePlaceholder },
      "#wish-message": { placeholder: cfg.messagePlaceholder },
    });
  }

  function populateRsvp() {
    var cfg = WEDDING_CONFIG.rsvp;

    populateText({
      ".rsvp__heading": cfg.heading,
      ".rsvp__description": cfg.description || "",
      '.rsvp__label[for="rsvp-name"]': cfg.guestNameLabel,
      ".rsvp__submit": cfg.submitText,
    });

    var descEl = document.querySelector(".rsvp__description");
    if (descEl && !cfg.description) descEl.style.display = "none";

    setAttr("#rsvp-name", "placeholder", cfg.guestNamePlaceholder);

    var attendanceFieldset = document.querySelector(".rsvp__attendance");
    if (attendanceFieldset) {
      setText(".rsvp__legend", cfg.attendanceLegend, attendanceFieldset);

      var legend = attendanceFieldset.querySelector(".rsvp__legend");
      attendanceFieldset.innerHTML = "";
      if (legend) attendanceFieldset.appendChild(legend);
      var optionsGroup = document.createElement("div");
      optionsGroup.className = "rsvp__attendance-options";
      attendanceFieldset.appendChild(optionsGroup);

      cfg.attendanceOptions.forEach(function (option) {
        var label = document.createElement("label");
        label.className = "rsvp__attendance-option";
        label.innerHTML =
          '<input type="radio" name="attendance" value="" class="rsvp__radio">' +
          "<span></span>";
        label.querySelector("input").value = option.value;
        label.querySelector("span").textContent = option.label;
        optionsGroup.appendChild(label);
      });
    }
  }

  function populateGifts() {
    var cfg = WEDDING_CONFIG.gifts;
    if (!cfg) return;

    populateText({
      ".gifts__heading": cfg.heading,
      ".gifts__subtitle": cfg.subtitle,
    });

    ["groom", "bride"].forEach(function (role) {
      var card = document.querySelector(
        '.gifts__card[data-gift="' + role + '"]',
      );
      if (!card || !cfg[role]) return;

      var data = cfg[role];
      populateText(
        {
          ".gifts__card-label": data.label,
          ".gifts__account-name": data.name,
          ".gifts__bank-name": data.bank,
          ".gifts__account-number": data.accountNumber,
        },
        card,
      );

      var subtitleEl = card.querySelector(".gifts__card-subtitle");
      if (subtitleEl) {
        subtitleEl.innerHTML = "";
        var cta = document.createElement("span");
        cta.className = "gifts__card-cta";
        cta.textContent = getGiftCtaText(data.subtitle);
        subtitleEl.appendChild(cta);
      }

      populateAttrs(
        {
          ".gifts__qr-img": { src: data.qrImage, alt: "Mã QR " + data.label },
        },
        card,
      );
    });
  }

  function populateContactInfo() {
    var cfg = WEDDING_CONFIG.contactInfo;
    if (!cfg) return;

    populateText({
      ".contact-info__heading": cfg.heading,
      ".contact-info__phone": cfg.phone,
      ".contact-info__name": cfg.name,
    });
  }

  function populateThankYou() {
    var cfg = WEDDING_CONFIG.thankYou;

    setSectionBackground("thank-you", cfg.backgroundImage);

    populateText({
      ".thank-you__heading": cfg.heading,
      ".thank-you__message": cfg.message,
    });
  }

  // =========================================================================
  // REGION 3: INTERACTIVE FEATURES
  // =========================================================================

  // --- 3a. Page Preloader ---------------------------------------------------

  function initPreloader() {
    var loader = document.getElementById("loader");
    if (!loader) return;

    document.body.style.overflow = "hidden";

    function hideLoaderAndStartCover() {
      setTimeout(function () {
        loader.classList.add("loader--hidden");
        setTimeout(function () {
          loader.style.display = "none";
          document.body.style.overflow = "";
          var cover = document.getElementById("cover");
          if (cover) {
            cover.classList.add("cover--ready");
            initAutoScrollHint(cover);
          }
        }, PRELOADER_FADE_DURATION);
      }, PRELOADER_HIDE_DELAY);
    }

    if (document.readyState === "complete") {
      hideLoaderAndStartCover();
    } else {
      window.addEventListener("load", hideLoaderAndStartCover);
    }
  }

  // --- 3b. Ambient Audio ---------------------------------------------------

  function initAmbientAudio() {
    var consentWrap = document.getElementById("ambient-audio-consent");
    var consentBtn = consentWrap
      ? consentWrap.querySelector(".ambient-audio__button")
      : null;
    var consentIcon = consentBtn
      ? consentBtn.querySelector(".ambient-audio__icon")
      : null;
    var consentLabel = consentBtn
      ? consentBtn.querySelector(".ambient-audio__label")
      : null;

    var ambientAudio = new Audio(AMBIENT_AUDIO_SRC_COVER);
    ambientAudio.loop = true;
    ambientAudio.preload = "auto";
    ambientAudio.volume = AMBIENT_AUDIO_VOLUME;
    var AUDIO_LABEL_WHEN_ON = "Tắt Âm Thanh";
    var AUDIO_LABEL_WHEN_OFF = "Bật Âm Thanh";
    var isAudioOn = false;
    var hasUserEnabledAudio = false;
    // Fallback in case a browser intermittently misses native loop behavior.
    ambientAudio.addEventListener("ended", function () {
      if (!isAudioOn) return;
      try {
        ambientAudio.currentTime = 0;
      } catch (e) {}
      tryPlay();
    });

    var currentTrackSrc = AMBIENT_AUDIO_SRC_COVER;
    var retryAttached = false;

    function showControl() {
      if (!consentWrap) return;
      consentWrap.classList.add("ambient-audio--visible");
      consentWrap.setAttribute("aria-hidden", "false");
    }

    function setButtonState(isOn) {
      if (consentWrap) {
        consentWrap.classList.toggle("ambient-audio--on", isOn);
        consentWrap.classList.toggle("ambient-audio--off", !isOn);
      }
      if (!consentBtn) return;
      consentBtn.classList.toggle("ambient-audio__button--on", isOn);
      consentBtn.classList.toggle("ambient-audio__button--off", !isOn);
      consentBtn.setAttribute("aria-pressed", isOn ? "true" : "false");

      if (consentIcon) {
        consentIcon.classList.toggle("ri-volume-up-line", isOn);
        consentIcon.classList.toggle("ri-volume-mute-line", !isOn);
      }
      if (consentLabel) {
        consentLabel.textContent = isOn
          ? AUDIO_LABEL_WHEN_ON
          : AUDIO_LABEL_WHEN_OFF;
      }
    }

    function removeRetryListeners() {
      if (!retryAttached) return;
      unregisterDocumentListeners(GESTURE_RETRY_EVENTS, onFirstGesture);
      retryAttached = false;
    }

    function addRetryListeners() {
      if (!isAudioOn || !hasUserEnabledAudio) return;
      if (retryAttached) return;
      registerDocumentListeners(GESTURE_RETRY_EVENTS, onFirstGesture);
      retryAttached = true;
    }

    function tryPlay() {
      if (!isAudioOn) return;
      var playAttempt = ambientAudio.play();

      // Older engines may not return a Promise from play().
      if (!playAttempt || typeof playAttempt.then !== "function") {
        removeRetryListeners();
        return;
      }

      playAttempt.then(removeRetryListeners).catch(function () {
        showControl();
        addRetryListeners();
      });
    }

    function onFirstGesture() {
      if (!isAudioOn || !hasUserEnabledAudio) return;
      tryPlay();
    }

    function setAudioState(nextIsOn) {
      isAudioOn = !!nextIsOn;
      setButtonState(isAudioOn);

      if (isAudioOn) {
        hasUserEnabledAudio = true;
        tryPlay();
        return;
      }

      removeRetryListeners();
      ambientAudio.pause();
    }

    if (consentBtn) {
      consentBtn.addEventListener("click", function () {
        setAudioState(!isAudioOn);
      });
    }

    showControl();
    setButtonState(false);

    function switchAmbientTrack(nextSrc) {
      if (!nextSrc || nextSrc === currentTrackSrc) return;
      currentTrackSrc = nextSrc;

      ambientAudio.src = nextSrc;
      ambientAudio.load();
      if (isAudioOn) tryPlay();
    }

    return {
      switchAmbientTrack: switchAmbientTrack,
    };
  }

  // --- 3c. Cover Exit Audio Switch ----------------------------------------

  function initCoverExitAudioSwitch(ambientControl) {
    if (
      !ambientControl ||
      typeof ambientControl.switchAmbientTrack !== "function"
    )
      return;

    var cover = document.getElementById("cover");
    if (!cover) return;

    var hasSwitchedAfterCover = false;

    function switchOnce() {
      if (hasSwitchedAfterCover) return;
      hasSwitchedAfterCover = true;
      ambientControl.switchAmbientTrack(AMBIENT_AUDIO_SRC_AFTER_COVER);
    }

    function isCoverOutOfView() {
      var rect = cover.getBoundingClientRect();
      return rect.bottom <= 0;
    }

    if ("IntersectionObserver" in window) {
      var observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (hasSwitchedAfterCover) return;
            if (!entry.isIntersecting && entry.boundingClientRect.bottom <= 0) {
              switchOnce();
              observer.unobserve(cover);
            }
          });
        },
        { threshold: 0 },
      );

      observer.observe(cover);
      return;
    }

    function onViewportChange() {
      if (!isCoverOutOfView()) return;
      switchOnce();
      window.removeEventListener("scroll", onViewportChange);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("orientationchange", onViewportChange);
    }

    window.addEventListener("scroll", onViewportChange, { passive: true });
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("orientationchange", onViewportChange);
    onViewportChange();
  }

  // --- 3d. Scroll Stagger Animations --------------------------------------

  var STAGGER_DELAY = 150; // ms between each sibling in a batch

  function initStaggerAnimations() {
    var items = document.querySelectorAll("[data-stagger] .stagger-item");
    var thankYouHeading = document.querySelector(
      ".thank-you__heading.stagger-item",
    );
    var thankYouMessage = document.querySelector(
      ".thank-you__message.stagger-item",
    );
    var thankYouCredit = document.querySelector(
      ".thank-you__credit.stagger-item",
    );
    var messageTimerStarted = false;
    var creditTimerStarted = false;
    var useThankYouTimerFlow = !!(thankYouHeading && thankYouMessage);
    var useThankYouCreditTimerFlow = !!(thankYouMessage && thankYouCredit);

    if (!("IntersectionObserver" in window)) {
      items.forEach(function (el) {
        el.classList.add("stagger--visible");
      });
      return;
    }

    var revealQueue = [];
    var frameScheduled = false;

    function processQueue() {
      var batch = revealQueue.slice();
      revealQueue = [];
      frameScheduled = false;
      batch.forEach(function (item, i) {
        item.style.transitionDelay = i * STAGGER_DELAY + "ms";
        item.classList.add("stagger--visible");
      });
    }

    function startCreditTimer() {
      if (
        !useThankYouCreditTimerFlow ||
        creditTimerStarted ||
        thankYouCredit.classList.contains("stagger--visible")
      )
        return;

      creditTimerStarted = true;
      setTimeout(function () {
        thankYouCredit.style.transitionDelay = "0ms";
        thankYouCredit.classList.add("stagger--visible");
        observer.unobserve(thankYouCredit);
      }, THANK_YOU_CREDIT_DELAY);
    }

    function startThankYouMessageTimer() {
      if (
        !useThankYouTimerFlow ||
        messageTimerStarted ||
        thankYouMessage.classList.contains("stagger--visible")
      ) {
        startCreditTimer();
        return;
      }

      messageTimerStarted = true;
      setTimeout(function () {
        thankYouMessage.style.transitionDelay = "0ms";
        thankYouMessage.classList.add("stagger--visible");
        observer.unobserve(thankYouMessage);
        startCreditTimer();
      }, THANK_YOU_MESSAGE_DELAY);
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            if (useThankYouTimerFlow && entry.target === thankYouMessage) {
              observer.unobserve(entry.target);
              return;
            }
            if (useThankYouCreditTimerFlow && entry.target === thankYouCredit) {
              observer.unobserve(entry.target);
              return;
            }

            revealQueue.push(entry.target);
            observer.unobserve(entry.target);

            if (useThankYouTimerFlow && entry.target === thankYouHeading) {
              startThankYouMessageTimer();
            } else if (
              !useThankYouTimerFlow &&
              entry.target === thankYouMessage
            ) {
              startCreditTimer();
            }
          }
        });
        if (revealQueue.length && !frameScheduled) {
          frameScheduled = true;
          requestAnimationFrame(processQueue);
        }
      },
      { threshold: SCROLL_ANIM_THRESHOLD, rootMargin: "0px 0px -45% 0px" },
    );

    items.forEach(function (el) {
      observer.observe(el);
    });
  }

  // --- 3d. Countdown Timer -------------------------------------------------

  function initCountdown() {
    var timerEl = document.querySelector(".until__timer");
    if (!timerEl) return;

    var weddingDate = new Date(timerEl.getAttribute("data-wedding-date"));
    var els = {
      days: document.getElementById("countdown-days"),
      hours: document.getElementById("countdown-hours"),
      minutes: document.getElementById("countdown-minutes"),
      seconds: document.getElementById("countdown-seconds"),
    };

    function update() {
      var diff = Math.max(0, weddingDate - new Date());
      var d = Math.floor(diff / MS_PER_DAY);
      var h = Math.floor((diff / MS_PER_HOUR) % 24);
      var m = Math.floor((diff / MS_PER_MIN) % 60);
      var s = Math.floor((diff / MS_PER_SEC) % 60);

      if (els.days) els.days.textContent = String(d).padStart(2, "0");
      if (els.hours) els.hours.textContent = String(h).padStart(2, "0");
      if (els.minutes) els.minutes.textContent = String(m).padStart(2, "0");
      if (els.seconds) els.seconds.textContent = String(s).padStart(2, "0");
    }

    update();
    setInterval(update, MS_PER_SEC);
  }

  // --- 3e. Gallery Swiper Carousel -----------------------------------------

  function initGallerySwiper() {
    if (typeof Swiper === "undefined") return;
    var gallerySpacing = getCssPixelVar("--gallery-track-spacing", 16);
    var isMobileViewport =
      window.matchMedia &&
      window.matchMedia("(max-width: " + GALLERY_MOBILE_MAX_WIDTH + "px)")
        .matches;
    var horizontalPreloadRadius = isMobileViewport
      ? GALLERY_MOBILE_PRELOAD_RADIUS
      : GALLERY_HORIZONTAL_PRELOAD_RADIUS;

    galleryVerticalSwiper = new Swiper(".gallery__slider", {
      effect: "coverflow",
      grabCursor: true,
      centeredSlides: true,
      slidesPerView: "auto",
      initialSlide: Math.floor(WEDDING_CONFIG.gallery.images.length / 2),
      coverflowEffect: {
        rotate: 50,
        stretch: 0,
        depth: 100,
        modifier: 1,
        slideShadows: true,
      },
      autoplay: { delay: GALLERY_AUTOPLAY_DELAY, disableOnInteraction: false },
      loop: true,
      preloadImages: false,
      observer: true,
      observeParents: true,
      on: {
        init: function (swiper) {
          hydrateSwiperNeighborhood(swiper, GALLERY_VERTICAL_PRELOAD_RADIUS);
        },
        slideChangeTransitionStart: function (swiper) {
          hydrateSwiperNeighborhood(swiper, GALLERY_VERTICAL_PRELOAD_RADIUS);
        },
      },
    });

    galleryHorizontalSwiper = new Swiper(".gallery__horizontal-slider", {
      slidesPerView: "auto",
      spaceBetween: gallerySpacing,
      grabCursor: true,
      loop: !isMobileViewport,
      preloadImages: false,
      autoplay: isMobileViewport
        ? false
        : { delay: 1, disableOnInteraction: false },
      speed: isMobileViewport
        ? GALLERY_MOBILE_SCROLL_SPEED
        : GALLERY_SCROLL_SPEED,
      observer: true,
      observeParents: true,
      on: {
        init: function (swiper) {
          hydrateSwiperNeighborhood(swiper, horizontalPreloadRadius);
        },
        slideChangeTransitionStart: function (swiper) {
          hydrateSwiperNeighborhood(swiper, horizontalPreloadRadius);
        },
      },
    });

    function scheduleGalleryRelayout(delayMs) {
      if (!galleryVerticalSwiper && !galleryHorizontalSwiper) return;
      if (galleryRelayoutTimer) clearTimeout(galleryRelayoutTimer);

      galleryRelayoutTimer = setTimeout(
        function () {
          if (galleryRelayoutRaf) cancelAnimationFrame(galleryRelayoutRaf);

          galleryRelayoutRaf = requestAnimationFrame(function () {
            if (galleryHorizontalSwiper && galleryHorizontalSwiper.autoplay) {
              galleryHorizontalSwiper.autoplay.stop();
            }

            if (galleryVerticalSwiper) galleryVerticalSwiper.update();
            if (galleryHorizontalSwiper) galleryHorizontalSwiper.update();

            if (galleryHorizontalSwiper && galleryHorizontalSwiper.autoplay) {
              galleryHorizontalSwiper.autoplay.start();
            }
          });
        },
        Number.isFinite(delayMs) ? delayMs : GALLERY_RELAYOUT_DELAY,
      );
    }

    function onGalleryViewportChange() {
      scheduleGalleryRelayout(GALLERY_RELAYOUT_DELAY);
    }

    window.addEventListener("load", onGalleryViewportChange);
    window.addEventListener("resize", onGalleryViewportChange);
    window.addEventListener("orientationchange", onGalleryViewportChange);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", onGalleryViewportChange);
    }

    var galleryImages = document.querySelectorAll(".gallery .gallery__img");
    galleryImages.forEach(function (img) {
      if (!img.complete) {
        img.addEventListener("load", onGalleryViewportChange, { once: true });
        img.addEventListener("error", onGalleryViewportChange, { once: true });
      }
    });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(onGalleryViewportChange).catch(function () {});
    }

    scheduleGalleryRelayout(0);
    window.setTimeout(onGalleryViewportChange, 120);
  }

  // --- 3f. Gallery Lightbox ------------------------------------------------

  function initLightbox() {
    var lightbox = document.getElementById("lightbox");
    var lightboxImg = document.getElementById("lightbox-img");
    if (!lightbox || !lightboxImg) return;

    var gallery = WEDDING_CONFIG.gallery;
    var pools = {
      vertical: gallery.images,
      horizontal: gallery.horizontalImages || [],
    };
    var currentPool = [];
    var currentIndex = 0;

    function setLightboxImage(image) {
      if (!image) return;
      lightboxImg.src = toOptimizedImagePath(image.src);
      lightboxImg.alt = image.alt;
    }

    function show(pool, index) {
      currentPool = pool;
      currentIndex = index;
      setLightboxImage(currentPool[currentIndex]);
      lightbox.classList.add("lightbox--open");
      lightbox.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    }

    function close() {
      lightbox.classList.remove("lightbox--open");
      lightbox.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }

    function prev() {
      currentIndex =
        (currentIndex - 1 + currentPool.length) % currentPool.length;
      setLightboxImage(currentPool[currentIndex]);
    }

    function next() {
      currentIndex = (currentIndex + 1) % currentPool.length;
      setLightboxImage(currentPool[currentIndex]);
    }

    document.addEventListener("click", function (e) {
      var link = e.target.closest("[data-lightbox-index]");
      if (link) {
        e.preventDefault();
        var idx = parseInt(link.getAttribute("data-lightbox-index"), 10);
        var poolName = link.getAttribute("data-lightbox-pool");
        show(pools[poolName] || pools.vertical, idx);
      }
    });

    lightbox.querySelector(".lightbox__close").addEventListener("click", close);
    lightbox.querySelector(".lightbox__prev").addEventListener("click", prev);
    lightbox.querySelector(".lightbox__next").addEventListener("click", next);

    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) close();
    });

    document.addEventListener("keydown", function (e) {
      if (!lightbox.classList.contains("lightbox--open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    });
  }

  // --- 3g. Wishes Form Submission ------------------------------------------

  function initWishesForm() {
    var form = document.getElementById("wishes-form");
    if (!form) return;

    var api = WEDDING_CONFIG.api;
    var cfg = WEDDING_CONFIG.wishes;
    var section = document.getElementById("wishes");
    var heading = section ? section.querySelector(".wishes__heading") : null;

    function markSuccess(submitBtn) {
      form.reset();
      if (submitBtn) {
        submitBtn.textContent = cfg.submittedText;
        submitBtn.disabled = true;
        submitBtn.classList.add("wishes__submit--success");
      }
      showSectionSuccess(section, heading, cfg.successMessage);
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var nameInput = document.getElementById("wish-name");
      var messageInput = document.getElementById("wish-message");
      var submitBtn = form.querySelector(".wishes__submit");

      var name = nameInput ? nameInput.value.trim() : "";
      var message = messageInput ? messageInput.value.trim() : "";
      if (!name || !message) return;

      var payload = { action: "wish", author_name: name, content: message };
      submitFormWithFallback({
        api: api,
        payload: payload,
        submitBtn: submitBtn,
        submittingText: cfg.submittingText,
        submitText: cfg.submitText,
        onSuccess: function () {
          markSuccess(submitBtn);
        },
        onError: function () {
          showFormMessage(form, cfg.errorMessage, "error");
        },
      });
    });
  }

  // --- 3h. RSVP Form Submission --------------------------------------------

  function initRsvpForm() {
    var form = document.getElementById("rsvp-form");
    if (!form) return;

    var api = WEDDING_CONFIG.api;
    var cfg = WEDDING_CONFIG.rsvp;
    var section = document.getElementById("rsvp");
    var heading = section ? section.querySelector(".rsvp__heading") : null;

    function markSuccess(submitBtn) {
      if (submitBtn) {
        submitBtn.textContent = cfg.submittedText;
        submitBtn.disabled = true;
        submitBtn.classList.add("rsvp__submit--success");
      }

      var existingMessage = form.querySelector(".form-message");
      if (existingMessage) existingMessage.remove();
      showSectionSuccess(section, heading, cfg.successMessage);
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var submitBtn = form.querySelector(".rsvp__submit");
      var nameInput = document.getElementById("rsvp-name");
      var attendanceRadio = form.querySelector(
        'input[name="attendance"]:checked',
      );

      if (!nameInput || !nameInput.value.trim() || !attendanceRadio) {
        showFormMessage(form, cfg.validationError, "error");
        return;
      }

      var payload = {
        action: "rsvp",
        guest_name: nameInput.value.trim(),
        attendance: attendanceRadio.value,
      };

      submitFormWithFallback({
        api: api,
        payload: payload,
        submitBtn: submitBtn,
        submittingText: cfg.submittingText,
        submitText: cfg.submitText,
        onSuccess: function () {
          markSuccess(submitBtn);
        },
        onError: function () {
          showFormMessage(form, cfg.errorMessage, "error");
        },
      });
    });
  }

  // --- 3j. Auto-scroll Hint (discoverability for scrollable page) -----------

  var AUTO_SCROLL_FALLBACK_MS = 4000; // if transitionend never fires

  function initAutoScrollHint(coverSection) {
    if (!coverSection || !coverSection.classList.contains("cover--ready"))
      return;

    var cfg = WEDDING_CONFIG.autoScrollHint || {};
    if (cfg.enabled === false) return;

    var prefersReducedMotion =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    var bufferMs =
      typeof cfg.bufferAfterFadeMs === "number" ? cfg.bufferAfterFadeMs : 500;
    var speedPxPerSec =
      typeof cfg.speedPxPerSec === "number" ? cfg.speedPxPerSec : 50;

    var lastEl = null;
    var maxDelay = -1;
    var all = coverSection.querySelectorAll(".cover__animate");
    for (var i = 0; i < all.length; i++) {
      var d = parseInt(all[i].getAttribute("data-cover-delay") || "0", 10);
      if (d > maxDelay) {
        maxDelay = d;
        lastEl = all[i];
      }
    }
    if (!lastEl) return;

    var scheduled = false;
    var fallbackId = null;

    function startAutoScroll() {
      if (scheduled) return;
      scheduled = true;
      if (fallbackId) clearTimeout(fallbackId);
      lastEl.removeEventListener("transitionend", onTransitionEnd);

      setTimeout(function () {
        runAutoScroll();
      }, bufferMs);
    }

    function onTransitionEnd() {
      startAutoScroll();
    }

    lastEl.addEventListener("transitionend", onTransitionEnd);
    fallbackId = setTimeout(startAutoScroll, AUTO_SCROLL_FALLBACK_MS);

    function runAutoScroll() {
      var rafId = null;
      var lastTime = performance.now();
      var stopped = false;
      var finished = false;
      var idleResumeId = null;
      var IDLE_RESUME_MS = 20000;
      var consentElement = document.querySelector(
        AMBIENT_AUDIO_CONSENT_SELECTOR,
      );

      function isAudioConsentInteraction(event) {
        if (!event || !event.target || !consentElement) return false;
        if (typeof event.target.closest !== "function") return false;
        return !!event.target.closest(AMBIENT_AUDIO_CONSENT_SELECTOR);
      }

      function clearIdleResume() {
        if (!idleResumeId) return;
        clearTimeout(idleResumeId);
        idleResumeId = null;
      }

      function removeInteractionListeners() {
        document.removeEventListener("touchstart", pause, { passive: true });
        document.removeEventListener("touchmove", pause, { passive: true });
        document.removeEventListener("wheel", pause, { passive: true });
        document.removeEventListener("keydown", onKeyDown);
      }

      function finish() {
        if (finished) return;
        finished = true;
        stopped = true;
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        clearIdleResume();
        removeInteractionListeners();
      }

      function scheduleIdleResume() {
        if (finished) return;
        clearIdleResume();
        idleResumeId = setTimeout(function () {
          idleResumeId = null;
          if (finished || !stopped) return;

          var maxScroll =
            Math.max(
              document.documentElement.scrollHeight,
              document.body.scrollHeight,
            ) - window.innerHeight;
          var current = window.scrollY || window.pageYOffset;
          if (maxScroll <= 0 || current >= maxScroll) {
            finish();
            return;
          }

          stopped = false;
          lastTime = performance.now();
          if (!rafId) rafId = requestAnimationFrame(tick);
        }, IDLE_RESUME_MS);
      }

      function pause(event) {
        // Let users enable ambient audio without canceling auto-scroll hint.
        if (isAudioConsentInteraction(event)) return;
        if (finished) return;
        stopped = true;
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        scheduleIdleResume();
      }

      function onKeyDown(e) {
        var scrollKeys = [
          "ArrowUp",
          "ArrowDown",
          "PageUp",
          "PageDown",
          " ",
          "Space",
        ];
        if (scrollKeys.indexOf(e.key) !== -1) pause(e);
      }

      document.addEventListener("touchstart", pause, { passive: true });
      document.addEventListener("touchmove", pause, { passive: true });
      document.addEventListener("wheel", pause, { passive: true });
      document.addEventListener("keydown", onKeyDown);

      function tick(now) {
        if (finished || stopped) return;
        var raw = (now - lastTime) / 1000;
        var dt = raw <= 0 ? 0.016 : Math.min(raw, 0.05);
        lastTime = now;
        var maxScroll =
          Math.max(
            document.documentElement.scrollHeight,
            document.body.scrollHeight,
          ) - window.innerHeight;
        if (maxScroll <= 0) {
          finish();
          return;
        }
        var current = window.scrollY || window.pageYOffset;
        if (current >= maxScroll) {
          finish();
          return;
        }
        var step = speedPxPerSec * dt;
        document.documentElement.scrollTop = Math.min(
          current + step,
          maxScroll,
        );
        rafId = requestAnimationFrame(tick);
      }

      rafId = requestAnimationFrame(tick);
    }
  }

  // --- 3k. Cover viewport fit (cover-only special rule) ----------------------

  function initCoverViewportFit() {
    var coverSection = document.getElementById("cover");
    if (!coverSection) return;

    var coverContent = coverSection.querySelector(".cover__content");
    var dateEl = coverSection.querySelector(".cover__date");
    var venueEl = coverSection.querySelector(".cover__venue");
    if (!coverContent || !dateEl || !venueEl) return;

    var resizeTimer = null;
    var rafId = null;

    function applyCoverViewportFit() {
      if (rafId) cancelAnimationFrame(rafId);

      rafId = requestAnimationFrame(function () {
        // Reset first so each pass starts from the default design spacing.
        dateEl.style.removeProperty("margin-top");
        venueEl.style.removeProperty("margin-top");
        coverContent.style.removeProperty("padding-top");
        coverContent.style.removeProperty("padding-bottom");

        var containerHeight = Math.ceil(coverSection.clientHeight || 0);
        var contentHeight = Math.ceil(coverContent.scrollHeight || 0);
        var overflow = contentHeight - containerHeight;
        if (overflow <= 0) return;

        var dateGap =
          parseFloat(window.getComputedStyle(dateEl).marginTop) || 0;
        var venueGap =
          parseFloat(window.getComputedStyle(venueEl).marginTop) || 0;
        var baseTopPadding =
          parseFloat(window.getComputedStyle(coverContent).paddingTop) || 0;
        var baseBottomPadding =
          parseFloat(window.getComputedStyle(coverContent).paddingBottom) || 0;

        var remainingOverflow = overflow;

        // Preserve a visible gap rhythm while trimming only what is necessary.
        var minDateGap = 6;
        var minVenueGap = 8;
        var minTopPadding = 8;
        var minBottomPadding = 8;

        // 1) Reduce date gap first.
        var maxDateGapTrim = Math.max(0, dateGap - minDateGap);
        if (maxDateGapTrim > 0 && remainingOverflow > 0) {
          var dateGapTrim = Math.min(maxDateGapTrim, remainingOverflow);
          dateEl.style.marginTop = (dateGap - dateGapTrim).toFixed(3) + "px";
          remainingOverflow -= dateGapTrim;
        }

        if (remainingOverflow <= 0) return;

        // 2) Then reduce venue gap.
        var maxVenueGapTrim = Math.max(0, venueGap - minVenueGap);
        if (maxVenueGapTrim > 0 && remainingOverflow > 0) {
          var venueGapTrim = Math.min(maxVenueGapTrim, remainingOverflow);
          venueEl.style.marginTop = (venueGap - venueGapTrim).toFixed(3) + "px";
          remainingOverflow -= venueGapTrim;
        }

        if (remainingOverflow <= 0) return;

        // 3) Then reduce date-to-bottom spacing (cover bottom padding).
        var maxBottomTrim = Math.max(0, baseBottomPadding - minBottomPadding);
        if (maxBottomTrim > 0 && remainingOverflow > 0) {
          var bottomTrim = Math.min(maxBottomTrim, remainingOverflow);
          coverContent.style.paddingBottom =
            (baseBottomPadding - bottomTrim).toFixed(3) + "px";
          remainingOverflow -= bottomTrim;
        }

        if (remainingOverflow <= 0) return;

        // 4) Last resort: reduce top spacing above "ĐÁM CƯỚI".
        var maxTopTrim = Math.max(0, baseTopPadding - minTopPadding);
        if (maxTopTrim > 0 && remainingOverflow > 0) {
          var topTrim = Math.min(maxTopTrim, remainingOverflow);
          coverContent.style.paddingTop =
            (baseTopPadding - topTrim).toFixed(3) + "px";
        }
      });
    }

    function scheduleCoverViewportFit() {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(applyCoverViewportFit, 60);
    }

    window.addEventListener("resize", scheduleCoverViewportFit);
    window.addEventListener("orientationchange", scheduleCoverViewportFit);

    applyCoverViewportFit();
    window.setTimeout(applyCoverViewportFit, 250);

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(applyCoverViewportFit).catch(function () {});
    }
  }

  // --- 3i. Gift Card QR Toggle ---------------------------------------------

  function initGifts() {
    var cards = document.querySelectorAll(".gifts__card");

    function refreshPanelHeight(panel) {
      if (!panel || !panel.classList.contains("gifts__qr-panel--open")) return;
      panel.style.maxHeight = panel.scrollHeight + "px";
    }

    function closeAllCards() {
      cards.forEach(function (c) {
        var p = c.querySelector(".gifts__qr-panel");
        if (p) {
          p.classList.remove("gifts__qr-panel--open");
          p.style.maxHeight = "0px";
          p.style.removeProperty("margin-top");
        }
        c.classList.remove("gifts__card--active");
      });
    }

    function resolveDownloadFilename(card, imageSrc) {
      var role = card.getAttribute("data-gift");
      var fallbackName =
        role === "bride" ? "qr-nha-gai.png" : "qr-nha-trai.png";
      try {
        var parsed = new URL(imageSrc, window.location.href);
        var pathName = parsed.pathname || "";
        var fromPath = pathName.slice(pathName.lastIndexOf("/") + 1);
        return fromPath ? decodeURIComponent(fromPath) : fallbackName;
      } catch (err) {
        return fallbackName;
      }
    }

    function triggerQrDownload(card) {
      var giftsCfg = WEDDING_CONFIG.gifts || {};
      var role = card.getAttribute("data-gift");
      var roleCfg = (role && giftsCfg[role]) || null;
      var qrImg = card.querySelector(".gifts__qr-img");
      if (!qrImg && !roleCfg) return false;

      var src =
        (roleCfg && (roleCfg.qrImageDownload || roleCfg.qrImage)) ||
        (qrImg && (qrImg.currentSrc || qrImg.getAttribute("src") || qrImg.src));
      if (!src) return false;

      var link = document.createElement("a");
      link.href = src;
      link.download = resolveDownloadFilename(card, src);
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();

      return true;
    }

    function markDownloadSuccess(button, panel) {
      if (!button) return;

      var icon = button.querySelector(".gifts__download-icon");
      var text = button.querySelector(".gifts__download-text");

      button.classList.add("gifts__download-btn--success");
      button.setAttribute("aria-label", "Tải về thành công");

      if (icon) {
        icon.classList.remove("ri-download-2-line");
        icon.classList.add("ri-check-line");
      }
      if (text) text.textContent = "Tải về thành công";

      refreshPanelHeight(panel);
    }

    cards.forEach(function (card) {
      var panel = card.querySelector(".gifts__qr-panel");
      var qrImg = card.querySelector(".gifts__qr-img");
      var downloadBtn = card.querySelector(".gifts__download-btn");

      card.addEventListener("click", function () {
        var isOpen = panel && panel.classList.contains("gifts__qr-panel--open");

        closeAllCards();

        if (!isOpen && panel) {
          panel.classList.add("gifts__qr-panel--open");
          refreshPanelHeight(panel);
          card.classList.add("gifts__card--active");
        }
      });

      if (downloadBtn) {
        downloadBtn.addEventListener("click", function (e) {
          e.stopPropagation();
          if (triggerQrDownload(card)) {
            markDownloadSuccess(downloadBtn, panel);
          }
        });
      }

      if (qrImg) {
        qrImg.addEventListener("load", function () {
          refreshPanelHeight(panel);
        });
      }
    });
  }

  // =========================================================================
  // REGION 4: INITIALIZATION
  // =========================================================================

  function init() {
    applyReducedMotionTextOverrideClass();
    populateMeta();
    populateCover();
    populateFamily();
    populateUntilTheDay();
    populateSaveTheDate();
    populateTimeline();
    populateGallery();
    populateLocation();
    populateWishes();
    populateGifts();
    populateRsvp();
    populateContactInfo();
    populateThankYou();
    initDeferredSectionBackgrounds();
    applyHeadingIcons();

    var ambientControl = initAmbientAudio();
    initCoverExitAudioSwitch(ambientControl);
    initCountdown();
    initGallerySwiper();
    initLightbox();
    initStaggerAnimations();
    initWishesForm();
    initGifts();
    initRsvpForm();
    initCoverViewportFit();
    initFamilyNameLineSync();
    initTimelineMobileTextFit();
  }

  applyReducedMotionTextOverrideClass();
  initPreloader();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
