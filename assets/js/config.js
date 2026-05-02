/**
 * Wedding Card Configuration
 *
 * All text content, image paths, and data values are centralized here
 * for easy modification. Change any value below to customize the card.
 */

const UNTIL_THE_BIG_DAY_IMAGE =
  "assets/images/optimized/sections/until_the_day.jpg";
const SAVE_THE_DATE_IMAGE =
  "assets/images/optimized/sections/save_the_date.jpg";
const LOCATION_IMAGE = "assets/images/optimized/sections/hon_dau_resort.jpg";
const WISHES_IMAGE = "assets/images/optimized/sections/wishes.jpg";
const THANK_YOU_IMAGE = "assets/images/optimized/sections/thank_you.jpg";

const WEDDING_CONFIG = {
  // ──────────────────────────────────────────────
  // META / PAGE-LEVEL
  // ──────────────────────────────────────────────
  meta: {
    title: "Phúc – Vân | Thiệp Cưới",
    description: "Thiệp cưới Phúc & Vân",
  },

  // ──────────────────────────────────────────────
  // DEBUG TELEMETRY (Vercel logs)
  // Disable once cover-video issue is resolved in production.
  // ──────────────────────────────────────────────
  debug: {
    coverVideoTelemetry: true,
    coverVideoTelemetryEndpoint: "/api/video-debug",
    coverVideoTelemetryMaxEvents: 14,
    forceTextAnimationsWithReducedMotion: true,
  },

  // ──────────────────────────────────────────────
  // FAMILY (standalone house information section)
  // If any field is blank, JS falls back to parsing gifts subtitles.
  // ──────────────────────────────────────────────
  family: {
    heading: "Lễ Cưới",
    inviteTitle: "Trân trọng kính mời bạn",
    inviteLine: "Tham dự lễ cưới của chúng mình",
    topCenterSymbol: "♡",
    bottomCenterSymbol: "",
    groom: {
      houseLabel: "Nhà Trai",
      fatherName: "Lê Tự Khanh",
      motherName: "Nguyễn Thị Thanh Thủy",
      personName: "Lê Hoàng Phúc",
    },
    bride: {
      houseLabel: "Nhà Gái",
      fatherName: "Nguyễn Trung Toản",
      motherName: "Đặng Thị Thắng",
      personName: "Nguyễn Thị Hồng Vân",
    },
  },

  // ──────────────────────────────────────────────
  // WEDDING DATE (single source of truth)
  // All date displays derive from or reference this value
  // ──────────────────────────────────────────────
  weddingDate: "2026-05-28T15:00:00+07:00",

  // ──────────────────────────────────────────────
  // SECTION BACKGROUND RENDERING
  // Controls how each section background image is painted.
  // Values map directly to CSS background-size/position/repeat.
  // ──────────────────────────────────────────────
  sectionBackgrounds: {
    "until-the-day": {
      size: "cover",
      position: "center top",
      repeat: "no-repeat",
    },
    "save-the-date": {
      size: "cover",
      position: "center center",
      repeat: "no-repeat",
    },
    location: {
      size: "cover",
      position: "center center",
      repeat: "no-repeat",
    },
    wishes: {
      size: "cover",
      position: "center center",
      repeat: "no-repeat",
    },
    "thank-you": {
      size: "cover",
      position: "center top",
      repeat: "no-repeat",
    },
  },

  // ──────────────────────────────────────────────
  // COVER (opening section: names + date)
  // Prefer videoSources (ordered by browser compatibility).
  // Keep MP4 first because it is the most reliable path on Safari/iOS.
  // Keep videoUrl for backward compatibility with older script logic.
  // For broad support, encode MP4 as H.264 baseline-compatible (+faststart).
  // ──────────────────────────────────────────────
  cover: {
    groomName: "Hoàng Phúc",
    brideName: "Hồng Vân",
    locationLine1: "BIỂN ĐỒ SƠN,",
    locationLine2: "HẢI PHÒNG",
    forceVideoWithReducedMotion: true,
    videoSources: [
      {
        src: "assets/videos/ocean_waves_background_web.mp4",
        type: "video/mp4",
      },
      // Optional modern format (add file before enabling):
      // { src: "assets/videos/ocean_waves_background.webm", type: "video/webm" },
    ],
    videoUrl: "assets/videos/ocean_waves_background_web.mp4",
    posterImage: "assets/images/optimized/sections/ocean_waves_background.jpg",
    backgroundImage:
      "assets/images/optimized/sections/ocean_waves_background.jpg",
  },

  // ──────────────────────────────────────────────
  // UNTIL THE BIG DAY (countdown + welcome)
  // ──────────────────────────────────────────────
  untilTheDay: {
    backgroundImage: UNTIL_THE_BIG_DAY_IMAGE,
    heading: "Đếm ngược cùng chúng mình nhé",
    labels: {
      days: "Ngày",
      hours: "Giờ",
      minutes: "Phút",
      seconds: "Giây",
    },
    message:
      "Chúng mình rất vui mừng được chia sẻ ngày trọng đại này cùng bạn. Tại đây, bạn sẽ tìm thấy mọi thông tin về buổi lễ và tiệc cưới của chúng mình.",
  },

  // ──────────────────────────────────────────────
  // SAVE THE DATE (elegant date display)
  // ──────────────────────────────────────────────
  saveTheDate: {
    backgroundImage: SAVE_THE_DATE_IMAGE,
    heading: "Hẹn gặp bạn vào ngày",
    timeLine: "Từ 3 giờ chiều",
  },

  // ──────────────────────────────────────────────
  // WEDDING TIMELINE
  // ──────────────────────────────────────────────
  timeline: {
    subtitle: "Chương trình",
    heading: "Lễ cưới",
    items: [
      {
        time: "15:00",
        label: "TIỆC TRÀ CẠNH BIỂN",
        iconSrc: "assets/images/timeline-icons/cocktail-hour.svg",
        iconAlt: "Biểu tượng tiệc trà view biển",
      },
      {
        time: "17:00",
        label: "LỄ THÀNH HÔN",
        iconSrc: "assets/images/timeline-icons/wedding-rings.svg",
        iconAlt: "Biểu tượng lễ thành hôn",
      },
      {
        time: "17:30",
        label: "TIỆC CƯỚI PHÚC VÂN",
        iconSrc: "assets/images/timeline-icons/wedding-lunch.svg",
        iconAlt: "Biểu tượng tiệc cưới",
      },
    ],
  },

  // ──────────────────────────────────────────────
  // GALLERY
  // ──────────────────────────────────────────────
  gallery: {
    title: "Kỷ niệm của chúng mình",
    images: [
      {
        src: "assets/images/gallery/portrait/1.jpg",
        alt: "Ảnh cưới Phuc và Van - 1",
      },
      {
        src: "assets/images/gallery/portrait/BRS06289.jpg",
        alt: "Ảnh cưới Phuc và Van - 2",
      },
      {
        src: "assets/images/gallery/portrait/BRS06423.jpg",
        alt: "Ảnh cưới Phuc và Van - 4",
      },
      {
        src: "assets/images/gallery/portrait/BRS06457.jpg",
        alt: "Ảnh cưới Phuc và Van - 5",
      },
      {
        src: "assets/images/gallery/portrait/BRS06650.jpg",
        alt: "Ảnh cưới Phuc và Van - 6",
      },
      {
        src: "assets/images/gallery/portrait/BRS06726.jpg",
        alt: "Ảnh cưới Phuc và Van - 7",
      },
      {
        src: "assets/images/gallery/portrait/BRS06765.jpg",
        alt: "Ảnh cưới Phuc và Van - 8",
      },
      {
        src: "assets/images/gallery/portrait/BRS06793.jpg",
        alt: "Ảnh cưới Phuc và Van - 9",
      },
      {
        src: "assets/images/gallery/portrait/BRS06889.jpg",
        alt: "Ảnh cưới Phuc và Van - 10",
      },
      {
        src: "assets/images/gallery/portrait/DSC_2115.jpg",
        alt: "Ảnh cưới Phuc và Van - 11",
      },
      {
        src: "assets/images/gallery/portrait/DSC_2244.jpg",
        alt: "Ảnh cưới Phuc và Van - 12",
      },
      {
        src: "assets/images/gallery/portrait/DSC_2463.jpg",
        alt: "Ảnh cưới Phuc và Van - 13",
      },
      {
        src: "assets/images/gallery/portrait/DSC_2527.jpg",
        alt: "Ảnh cưới Phuc và Van - 14",
      },
      {
        src: "assets/images/gallery/portrait/DSC_2713.jpg",
        alt: "Ảnh cưới Phuc và Van - 15",
      },
      {
        src: "assets/images/gallery/portrait/DSC_2754.jpg",
        alt: "Ảnh cưới Phuc và Van - 16",
      },
      {
        src: "assets/images/gallery/portrait/DSC_5828.jpg",
        alt: "Ảnh cưới Phuc và Van - 17",
      },
      {
        src: "assets/images/gallery/portrait/DSC_5858.jpg",
        alt: "Ảnh cưới Phuc và Van - 18",
      },
      {
        src: "assets/images/gallery/portrait/DSC_5962.jpg",
        alt: "Ảnh cưới Phuc và Van - 19",
      },
      {
        src: "assets/images/gallery/portrait/DSC_5999.jpg",
        alt: "Ảnh cưới Phuc và Van - 20",
      },
      {
        src: "assets/images/gallery/portrait/DSC_6353.jpg",
        alt: "Ảnh cưới Phuc và Van - 21",
      },
      {
        src: "assets/images/gallery/portrait/DSC_6576.jpg",
        alt: "Ảnh cưới Phuc và Van - 22",
      },
      {
        src: "assets/images/gallery/portrait/DSC_6691.jpg",
        alt: "Ảnh cưới Phuc và Van - 23",
      },
      {
        src: "assets/images/gallery/portrait/DSC_6724.jpg",
        alt: "Ảnh cưới Phuc và Van - 24",
      },
      {
        src: "assets/images/gallery/portrait/DSC_6868.jpg",
        alt: "Ảnh cưới Phuc và Van - 25",
      },
      {
        src: "assets/images/gallery/portrait/DSC_7081.jpg",
        alt: "Ảnh cưới Phuc và Van - 26",
      },
      {
        src: "assets/images/gallery/portrait/DSC_7237.jpg",
        alt: "Ảnh cưới Phuc và Van - 27",
      },
      {
        src: "assets/images/gallery/portrait/DSC_7257.jpg",
        alt: "Ảnh cưới Phuc và Van - 28",
      },
      {
        src: "assets/images/gallery/portrait/DSC_7444.jpg",
        alt: "Ảnh cưới Phuc và Van - 29",
      },
      {
        src: "assets/images/gallery/portrait/DSC_7481.jpg",
        alt: "Ảnh cưới Phuc và Van - 30",
      },
      {
        src: "assets/images/gallery/portrait/DSC_7488.jpg",
        alt: "Ảnh cưới Phuc và Van - 31",
      },
    ],
    horizontalImages: [
      {
        src: "assets/images/gallery/landscape/BRS06089.jpg",
        alt: "Ảnh cưới Phuc và Van - ngang 1",
      },
      {
        src: "assets/images/gallery/landscape/BRS06473.jpg",
        alt: "Ảnh cưới Phuc và Van - ngang 2",
      },
      {
        src: "assets/images/gallery/landscape/BRS06503.jpg",
        alt: "Ảnh cưới Phuc và Van - ngang 3",
      },
      {
        src: "assets/images/gallery/landscape/BRS06525.jpg",
        alt: "Ảnh cưới Phuc và Van - ngang 4",
      },
      {
        src: "assets/images/gallery/landscape/DSC_1864.jpg",
        alt: "Ảnh cưới Phuc và Van - ngang 5",
      },
      {
        src: "assets/images/gallery/landscape/DSC_1938.jpg",
        alt: "Ảnh cưới Phuc và Van - ngang 6",
      },
      {
        src: "assets/images/gallery/landscape/DSC_1994.jpg",
        alt: "Ảnh cưới Phuc và Van - ngang 7",
      },
      {
        src: "assets/images/gallery/landscape/DSC_2491.jpg",
        alt: "Ảnh cưới Phuc và Van - ngang 8",
      },
      {
        src: "assets/images/gallery/landscape/DSC_2562.jpg",
        alt: "Ảnh cưới Phuc và Van - ngang 9",
      },
      {
        src: "assets/images/gallery/landscape/DSC_2882.jpg",
        alt: "Ảnh cưới Phuc và Van - ngang 10",
      },
      {
        src: "assets/images/gallery/landscape/DSC_2907.jpg",
        alt: "Ảnh cưới Phuc và Van - ngang 11",
      },
      {
        src: "assets/images/gallery/landscape/DSC_6794.jpg",
        alt: "Ảnh cưới Phuc và Van - ngang 12",
      },
    ],
  },

  // ──────────────────────────────────────────────
  // LOCATION (Google Maps)
  // ──────────────────────────────────────────────
  location: {
    backgroundImage: LOCATION_IMAGE,
    heading: "Địa điểm",
    venueName: "KHÁCH SẠN HOLIDAY",
    venueAddress: "Trong Hòn Dáu Resort, Đồ Sơn, Hải Phòng",
    googleMapsEmbedUrl:
      "https://maps.google.com/maps?q=Kh%C3%A1ch%20s%E1%BA%A1n%20Holiday%20H%C3%B2n%20D%E1%BA%A5u%20Resort%2C%20%C4%90%E1%BB%93%20S%C6%A1n%2C%20H%E1%BA%A3i%20Ph%C3%B2ng&z=13&output=embed",
    mapLinkText: "Mở trên Google Maps",
    mapLinkHref: "https://maps.app.goo.gl/SRDaoq3A8kUVkyg37",
  },

  // ──────────────────────────────────────────────
  // WISHES / GUESTBOOK
  // ──────────────────────────────────────────────
  wishes: {
    backgroundImage: WISHES_IMAGE,
    heading: "Gửi lời chúc đến chúng mình nhé",
    nameLabel: "Tên của bạn",
    namePlaceholder: "Tên của bạn",
    messageLabel: "Lời nhắn gửi",
    messagePlaceholder: "Lời nhắn gửi",
    submitText: "Gửi lời chúc",
    submittingText: "Đang gửi...",
    submittedText: "Đã gửi",
    successMessage: "Lời chúc của bạn đã được gửi đến cô dâu và chú rể!",
    errorMessage: "Có lỗi xảy ra, vui lòng thử lại!",
  },

  // ──────────────────────────────────────────────
  // GIFTS / MONEY TRANSFER
  // ──────────────────────────────────────────────
  gifts: {
    heading: "Gửi gắm yêu thương",
    subtitle:
      "Nếu bạn muốn gửi thêm một chút bất ngờ để tiếp sức cho hành trình mới của chúng mình, bạn có thể gửi qua đây nhé!",
    groom: {
      label: "CHÚ RỂ\nHOÀNG PHÚC",
      subtitle:
        'Lê Tự Khanh - Nguyễn Thị Thanh Thủy<br><em>Chú rể: Lê Hoàng Phúc</em><br><span class="gifts__card-cta">(Bấm vào đây để gửi quà)</span>',
      name: "LE HOANG PHUC",
      bank: "VIETINBANK",
      accountNumber: "108001695584",
      qrImage: "assets/images/qr-codes/groom/cropped.jpg",
      qrImageDownload: "assets/images/qr-codes/groom/non_cropped.jpg",
    },
    bride: {
      label: "CÔ DÂU\nHỒNG VÂN",
      subtitle:
        'Nguyễn Trung Toản - Đặng Thị Thắng<br><em>Cô dâu: Nguyễn Thị Hồng Vân</em><br><span class="gifts__card-cta">(Bấm vào đây để gửi quà)</span>',
      name: "NGUYEN THI HONG VAN",
      bank: "VIETCOMBANK",
      accountNumber: "0301000407003",
      qrImage: "assets/images/qr-codes/bride/cropped.jpg",
      qrImageDownload: "assets/images/qr-codes/bride/non_cropped.jpg",
    },
  },

  // ──────────────────────────────────────────────
  // RSVP
  // ──────────────────────────────────────────────
  rsvp: {
    heading: "Xác nhận tham dự",
    description: "",
    guestNameLabel: "Tên Khách Mời",
    guestNamePlaceholder: "Tên Khách Mời",
    attendanceLegend: "Xác nhận",
    attendanceOptions: [
      { value: "yes", label: "Có, tôi sẽ đến!" },
      { value: "no", label: "Xin lỗi, tôi không tham dự được!" },
    ],
    submitText: "Xác nhận",
    submittingText: "Đang gửi...",
    submittedText: "Đã xác nhận",
    validationError: "Vui lòng điền đầy đủ thông tin!",
    successMessage: "Chúng mình xin chân thành cảm ơn!",
    errorMessage: "Có lỗi xảy ra, vui lòng thử lại!",
  },

  // ──────────────────────────────────────────────
  // CONTACT INFO
  // ──────────────────────────────────────────────
  contactInfo: {
    heading: "Thông Tin Liên Lạc",
    phone: "0913041410",
    name: "Lê Tự Khanh",
  },

  // ──────────────────────────────────────────────
  // THANK YOU
  // ──────────────────────────────────────────────
  thankYou: {
    backgroundImage: THANK_YOU_IMAGE,
    heading: "Trân trọng cảm ơn",
    message: "Sự hiện diện của bạn là niềm vui của chúng mình!",
  },

  // ──────────────────────────────────────────────
  // HEADING ICONS (Remix Icons prepended by selector)
  // ──────────────────────────────────────────────
  headingIcons: {
    ".family__heading": "ri-heart-3-line",
    ".until__heading": "ri-hourglass-line",
    ".gallery__title": "ri-gallery-line",
    ".save-date__title": "ri-calendar-check-line",
    ".timeline__heading": "ri-time-line",
    ".location__heading": "ri-map-pin-line",
    ".rsvp__heading": "ri-checkbox-circle-line",
    ".wishes__heading": "ri-chat-heart-line",
    ".gifts__heading": "ri-gift-2-line",
    ".contact-info__heading": "ri-phone-line",
    ".thank-you__heading": "ri-hand-heart-line",
  },

  // ──────────────────────────────────────────────
  // AUTO-SCROLL HINT (helps users discover scrollable content)
  // Starts after cover text fades in, stops on first user interaction
  // ──────────────────────────────────────────────
  autoScrollHint: {
    enabled: true,
    bufferAfterFadeMs: 500,
    speedPxPerSec: 90,
  },

  // ──────────────────────────────────────────────
  // AMBIENT AUDIO
  // ──────────────────────────────────────────────
  audio: {
    afterCoverSrc: "assets/audio/carpenters_close_to_you.mp3",
  },

  // ──────────────────────────────────────────────
  // API — Google Apps Script Web App
  // Replace the URL below with your deployed Apps Script URL
  // (see backend/Code.gs for full setup instructions)
  // ──────────────────────────────────────────────
  api: {
    baseUrl:
      "https://script.google.com/macros/s/AKfycbxyAjfENKitNWb7mIQjkmVOQYToYsRBquUgb3gnrdn2VYph95bgkDPus6SVDMm447tS/exec",
  },
};
