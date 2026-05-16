/**
 * Optimize the cover background video for web delivery.
 *
 * Produces a small, fast-loading MP4 (and optionally WebM) from the
 * full-quality source video.  Also patches main.js and config.js so the
 * site uses the optimized assets and has sane loading timeouts.
 *
 * Prerequisites:
 *   - ffmpeg and ffprobe must be on PATH.
 *
 * Usage:
 *   node scripts/optimize-cover-video.js            # encode MP4 only
 *   node scripts/optimize-cover-video.js --webm      # encode MP4 + WebM
 *   node scripts/optimize-cover-video.js --patch-only # skip encoding, only patch JS
 *   node scripts/optimize-cover-video.js --help
 *
 * Re-running is safe — existing outputs are overwritten.
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
const ROOT = path.resolve(__dirname, "..");
const VIDEOS_DIR = path.join(ROOT, "assets", "videos");
const SOURCE_VIDEO = path.join(VIDEOS_DIR, "ocean_waves_background.mp4");
const OUTPUT_MP4 = path.join(VIDEOS_DIR, "ocean_waves_background_web.mp4");
const OUTPUT_WEBM = path.join(VIDEOS_DIR, "ocean_waves_background.webm");
const MAIN_JS = path.join(ROOT, "assets", "js", "main.js");
const CONFIG_JS = path.join(ROOT, "assets", "js", "config.js");

// ---------------------------------------------------------------------------
// Encoding settings — tweak these if you want different quality / size
// ---------------------------------------------------------------------------
const TARGET_WIDTH = 1280;
const TARGET_HEIGHT = 720;
const FPS = 24;
const CRF_H264 = 28; // visually transparent behind overlay text
const CRF_VP9 = 32;
const H264_PROFILE = "baseline";
const H264_LEVEL = "3.1";
const H264_PRESET = "slow";
const H264_KEYINT = 48; // 2s GOP at 24fps for stable decode/seek on older devices.

// JS patch values
const NEW_TIMEOUT_MS = 5000;
const NEW_PRELOAD = "auto";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function run(cmd, label) {
  console.log(`\n> ${label || cmd}`);
  try {
    execSync(cmd, { stdio: "inherit" });
  } catch (err) {
    console.error(`\nFailed: ${label || cmd}`);
    process.exit(1);
  }
}

function fileSizeMB(fp) {
  try {
    return (fs.statSync(fp).size / 1024 / 1024).toFixed(2);
  } catch {
    return "?";
  }
}

function patchFile(filepath, replacements) {
  const raw = fs.readFileSync(filepath, "utf-8");
  const useCRLF = raw.includes("\r\n");
  let content = raw;
  let changed = false;
  for (const { search, replace, label } of replacements) {
    const s = useCRLF ? search.replace(/(?<!\r)\n/g, "\r\n") : search;
    const r = useCRLF ? replace.replace(/(?<!\r)\n/g, "\r\n") : replace;
    if (content.includes(r)) {
      console.log(`  [skip] "${label}" — already patched`);
      continue;
    }
    if (!content.includes(s)) {
      console.warn(`  [warn] "${label}" — search string not found, skipping`);
      continue;
    }
    content = content.replace(s, r);
    changed = true;
    console.log(`  [done] ${label}`);
  }
  if (changed) fs.writeFileSync(filepath, content, "utf-8");
  return changed;
}

// ---------------------------------------------------------------------------
// Video encoding
// ---------------------------------------------------------------------------
function encodeMP4() {
  if (!fs.existsSync(SOURCE_VIDEO)) {
    console.error(`Source video not found: ${SOURCE_VIDEO}`);
    process.exit(1);
  }

  const cmd = [
    "ffmpeg -y",
    `-i "${SOURCE_VIDEO}"`,
    `-vf "scale=${TARGET_WIDTH}:${TARGET_HEIGHT}"`,
    `-c:v libx264 -profile:v ${H264_PROFILE} -level ${H264_LEVEL}`,
    `-pix_fmt yuv420p`,
    `-x264-params "keyint=${H264_KEYINT}:min-keyint=${H264_KEYINT}:scenecut=0"`,
    `-crf ${CRF_H264} -preset ${H264_PRESET}`,
    `-r ${FPS}`,
    "-an",
    "-movflags +faststart",
    `"${OUTPUT_MP4}"`,
  ].join(" ");

  run(cmd, "Encoding optimized MP4 (H.264, 720p)");
  console.log(`\n  Output: ${OUTPUT_MP4}  (${fileSizeMB(OUTPUT_MP4)} MB)`);
}

function encodeWebM() {
  if (!fs.existsSync(SOURCE_VIDEO)) {
    console.error(`Source video not found: ${SOURCE_VIDEO}`);
    process.exit(1);
  }

  const cmd = [
    "ffmpeg -y",
    `-i "${SOURCE_VIDEO}"`,
    `-vf "scale=${TARGET_WIDTH}:${TARGET_HEIGHT}"`,
    `-c:v libvpx-vp9 -crf ${CRF_VP9} -b:v 0`,
    `-r ${FPS}`,
    "-an",
    `"${OUTPUT_WEBM}"`,
  ].join(" ");

  run(cmd, "Encoding WebM (VP9, 720p) — this may take a while");
  console.log(`\n  Output: ${OUTPUT_WEBM}  (${fileSizeMB(OUTPUT_WEBM)} MB)`);
}

// ---------------------------------------------------------------------------
// JS patching
// ---------------------------------------------------------------------------
function patchMainJS() {
  console.log(`\nPatching ${path.relative(ROOT, MAIN_JS)} ...`);
  patchFile(MAIN_JS, [
    {
      search: "var COVER_VIDEO_FAIL_TIMEOUT = 3500;",
      replace: `var COVER_VIDEO_FAIL_TIMEOUT = ${NEW_TIMEOUT_MS};`,
      label: `COVER_VIDEO_FAIL_TIMEOUT → ${NEW_TIMEOUT_MS}ms`,
    },
    {
      search: 'coverVideo.preload = "metadata";',
      replace: `coverVideo.preload = "${NEW_PRELOAD}";`,
      label: `preload → "${NEW_PRELOAD}"`,
    },
  ]);
}

function patchConfigJS(includeWebM) {
  console.log(`\nPatching ${path.relative(ROOT, CONFIG_JS)} ...`);

  const replacements = [
    {
      search:
        '{ src: "assets/videos/ocean_waves_background.mp4", type: "video/mp4" },',
      replace:
        '{ src: "assets/videos/ocean_waves_background_web.mp4", type: "video/mp4" },',
      label: "videoSources → optimized MP4",
    },
    {
      search: 'videoUrl: "assets/videos/ocean_waves_background.mp4",',
      replace: 'videoUrl: "assets/videos/ocean_waves_background_web.mp4",',
      label: "videoUrl → optimized MP4",
    },
  ];

  if (includeWebM) {
    replacements.push({
      search:
        '      // Optional modern format (add file before enabling):\n' +
        '      // { src: "assets/videos/ocean_waves_background.webm", type: "video/webm" },',
      replace:
        '      { src: "assets/videos/ocean_waves_background.webm", type: "video/webm" },',
      label: "Enable WebM source (placed after MP4)",
    });
  }

  patchFile(CONFIG_JS, replacements);
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
function printSummary(includeWebM) {
  console.log("\n" + "=".repeat(60));
  console.log("  DONE — Cover video optimization complete");
  console.log("=".repeat(60));

  const sizes = [`  MP4: ${fileSizeMB(OUTPUT_MP4)} MB`];
  if (includeWebM) sizes.push(`  WebM: ${fileSizeMB(OUTPUT_WEBM)} MB`);
  sizes.push(`  Original: ${fileSizeMB(SOURCE_VIDEO)} MB`);
  console.log(sizes.join("\n"));

  console.log("\n  JS changes applied:");
  console.log(`    - COVER_VIDEO_FAIL_TIMEOUT = ${NEW_TIMEOUT_MS}ms`);
  console.log(`    - preload = "${NEW_PRELOAD}"`);
  console.log(`    - videoSources → optimized MP4${includeWebM ? " + WebM" : ""}`);
  console.log();
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
Usage: node scripts/optimize-cover-video.js [options]

Options:
  --webm         Also encode a WebM/VP9 version and enable it in config.js
  --patch-only   Skip video encoding, only apply JS patches
  --help         Show this help
`);
    return;
  }

  const includeWebM = args.includes("--webm");
  const patchOnly = args.includes("--patch-only");

  console.log("=".repeat(60));
  console.log("  Cover Video Optimizer");
  console.log("=".repeat(60));

  if (!patchOnly) {
    console.log(`\nSource: ${SOURCE_VIDEO}  (${fileSizeMB(SOURCE_VIDEO)} MB)`);

    encodeMP4();
    if (includeWebM) encodeWebM();
  } else {
    console.log("\n  --patch-only: skipping video encoding");
  }

  patchMainJS();
  patchConfigJS(includeWebM);
  printSummary(includeWebM);
}

main();
