/*
 * Host-side tests for the Eskiu icon mesher (src/icon/) through its C ABI.
 *
 *   icon_test <icons.tsv> <out-dir> [all-icons.tsv]
 *
 * icons.tsv holds one "name<TAB>svg-element-markup" line per icon. The meshes of
 * those icons are written to <out-dir>/<name>.json for rasterising. The optional
 * third file is swept for parse errors, NaNs and out-of-box vertices only.
 *
 * Run through scripts/eskiu-icon-test.mjs, which compiles the Eskiu runtime first.
 */
#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "expo_pico_eskiu.h"

static int g_failures = 0;
static int g_checks = 0;

#define CHECK(cond, ...)                                    \
  do {                                                      \
    g_checks++;                                             \
    if (!(cond)) {                                          \
      g_failures++;                                         \
      fprintf(stderr, "FAIL %s:%d: ", __FILE__, __LINE__);  \
      fprintf(stderr, __VA_ARGS__);                         \
      fprintf(stderr, "\n");                                \
    }                                                       \
  } while (0)

static int near(double a, double b, double eps) { return fabs(a - b) <= eps; }

/* Same angle step as icon_arc_step in stroke.esk. */
static double arc_step(double r, double tol) {
  if (r <= tol) return M_PI * 0.5;
  double step = 2.0 * acos(1.0 - tol / r);
  if (step > M_PI * 0.5) return M_PI * 0.5;
  if (step < 0.0001) return 0.0001;
  return step;
}

static int arc_segments(double sweep, double step) {
  int n = (int)ceil(fabs(sweep) / step - 1e-9);
  return n < 1 ? 1 : n;
}

/* ---------------------------------------------------------------- path parsing */

typedef struct {
  int rc;
  uint32_t points;
  uint32_t subpaths;
  float xy[8192];
} Flat;

static Flat g_flat;

static Flat *flatten(const char *d, float tol) {
  memset(&g_flat, 0, sizeof g_flat);
  g_flat.rc = expo_pico_svg_path_flatten(d, tol, g_flat.xy, 4096, &g_flat.points,
                                         &g_flat.subpaths);
  return &g_flat;
}

static void expect_points(const char *d, uint32_t subpaths, const float *pts, uint32_t n) {
  Flat *f = flatten(d, 0.01f);
  CHECK(f->rc == EXPO_PICO_ICON_OK, "'%s': rc=%d", d, f->rc);
  CHECK(f->subpaths == subpaths, "'%s': subpaths=%u want %u", d, f->subpaths, subpaths);
  CHECK(f->points == n, "'%s': points=%u want %u", d, f->points, n);
  for (uint32_t i = 0; i < n && i < f->points; i++) {
    CHECK(near(f->xy[i * 2], pts[i * 2], 1e-5) && near(f->xy[i * 2 + 1], pts[i * 2 + 1], 1e-5),
          "'%s': point %u = (%g, %g) want (%g, %g)", d, i, f->xy[i * 2], f->xy[i * 2 + 1],
          pts[i * 2], pts[i * 2 + 1]);
  }
}

/* Largest distance from the true curve (sampled densely) to the flattened polyline. */
static double max_deviation(const Flat *f, void (*curve)(double t, double *x, double *y)) {
  double worst = 0.0;
  for (int k = 0; k <= 2000; k++) {
    double x, y;
    curve(k / 2000.0, &x, &y);
    double best = 1e30;
    for (uint32_t i = 0; i + 1 < f->points; i++) {
      double ax = f->xy[i * 2], ay = f->xy[i * 2 + 1];
      double bx = f->xy[i * 2 + 2], by = f->xy[i * 2 + 3];
      double dx = bx - ax, dy = by - ay;
      double len2 = dx * dx + dy * dy;
      double t = len2 > 0 ? ((x - ax) * dx + (y - ay) * dy) / len2 : 0;
      if (t < 0) t = 0;
      if (t > 1) t = 1;
      double ex = ax + t * dx - x, ey = ay + t * dy - y;
      double dist = sqrt(ex * ex + ey * ey);
      if (dist < best) best = dist;
    }
    if (best > worst) worst = best;
  }
  return worst;
}

static void cubic_ref(double t, double *x, double *y) { /* M0 0C0 10 10 10 10 0 */
  double u = 1 - t;
  *x = 3 * u * t * t * 10 + t * t * t * 10;
  *y = 3 * u * u * t * 10 + 3 * u * t * t * 10;
}

static void quad_t_ref(double t, double *x, double *y) { /* M0 0Q5 10 10 0T20 0 */
  double s = t * 2, cx, cy, x0, y0, x2;
  if (s <= 1) { x0 = 0; y0 = 0; cx = 5; cy = 10; x2 = 10; }
  else { s -= 1; x0 = 10; y0 = 0; cx = 15; cy = -10; x2 = 20; }
  double u = 1 - s;
  *x = u * u * x0 + 2 * u * s * cx + s * s * x2;
  *y = u * u * y0 + 2 * u * s * cy;
}

static void arc_ref(double t, double *x, double *y) { /* M0 10A10 10 0 0 1 20 10: top half */
  double a = M_PI + t * M_PI;
  *x = 10 + 10 * cos(a);
  *y = 10 + 10 * sin(a);
}

static void test_path_parsing(void) {
  { const float p[] = {10, 20, 30, 40}; expect_points("M10 20L30 40", 1, p, 2); }
  { const float p[] = {0.5f, -0.5f, 1, 0}; expect_points("M.5-.5l.5.5", 1, p, 2); }
  { const float p[] = {1.5f, 0.5f, 2, 2}; expect_points("M1.5.5L2,2", 1, p, 2); }
  { const float p[] = {10, 0.2f, 35, -4}; expect_points("M1e1 2E-1 L3.5e+1,-4", 1, p, 2); }
  { const float p[] = {-1, 2, 3, -4}; expect_points("M-1+2L3-4", 1, p, 2); }
  { const float p[] = {0, 0, 10, 0, 10, 10}; expect_points("M0 0 10 0 10 10", 1, p, 3); }
  { const float p[] = {1, 1, 3, 1, 3, 3}; expect_points("m1 1 2 0 0 2", 1, p, 3); }
  { const float p[] = {0, 0, 5, 0, 5, 5, 0, 5}; expect_points("M0 0H5V5h-5v-5z", 1, p, 4); }
  { const float p[] = {0, 0, 1, 0, 0, 0, 0, 1}; expect_points("M0 0L1 0Z L0 1", 2, p, 4); }
  { const float p[] = {0, 0, 1, 1, 2, 2, 3, 3}; expect_points("M0 0L1 1M2 2L3 3", 2, p, 4); }
  { const float p[] = {2, 2, 4, 4}; expect_points("  M 2 , 2\n\tl 2 2  ", 1, p, 2); }
  /* Lucide's "dot" idiom: a 0.01-long horizontal segment. */
  { const float p[] = {12, 17, 12.01f, 17}; expect_points("M12 17h.01", 1, p, 2); }

  /* Compact arc flags: "105 5" is large=1, sweep=0, x=5, y=5. */
  Flat *f = flatten("M0 0a5 5 0 105 5", 0.01f);
  CHECK(f->rc == EXPO_PICO_ICON_OK, "compact arc flags rc=%d", f->rc);
  CHECK(f->points > 10, "compact arc flags: %u points", f->points);
  if (f->points > 0) {
    CHECK(near(f->xy[(f->points - 1) * 2], 5, 1e-5) && near(f->xy[(f->points - 1) * 2 + 1], 5, 1e-5),
          "compact arc ends at (%g, %g)", f->xy[(f->points - 1) * 2], f->xy[(f->points - 1) * 2 + 1]);
  }

  const char *bad[] = {"L1 1", "M1", "M0 0 L", "M0 0Z 1 1", "M0 0 X1 1", "M0 0A1 1 0 2 0 1 1",
                       "M0 0L1 1e", "M0 0L. 1"};
  for (size_t i = 0; i < sizeof bad / sizeof bad[0]; i++) {
    Flat *g = flatten(bad[i], 0.01f);
    /* "1e" is read as 1 followed by a stray 'e': still a parse error, never a silent 1e0. */
    CHECK(g->rc == EXPO_PICO_ICON_ERR_PARSE, "'%s' should fail to parse, rc=%d", bad[i], g->rc);
  }

  /* Flattening accuracy for cubic, quadratic + T reflection, and arcs. */
  const float tols[] = {0.5f, 0.05f, 0.01f};
  for (int k = 0; k < 3; k++) {
    float tol = tols[k];
    f = flatten("M0 0C0 10 10 10 10 0", tol);
    double dev = max_deviation(f, cubic_ref);
    CHECK(f->rc == 0 && dev <= tol * 1.001, "cubic tol=%g deviation=%g points=%u", tol, dev, f->points);
    f = flatten("M0 0Q5 10 10 0T20 0", tol);
    dev = max_deviation(f, quad_t_ref);
    CHECK(f->rc == 0 && dev <= tol * 1.001, "quad+T tol=%g deviation=%g points=%u", tol, dev, f->points);
    f = flatten("M0 10A10 10 0 0 1 20 10", tol);
    dev = max_deviation(f, arc_ref);
    CHECK(f->rc == 0 && dev <= tol * 1.001, "arc tol=%g deviation=%g points=%u", tol, dev, f->points);
  }
  /* Tighter tolerance means more points (adaptive, not fixed). */
  uint32_t coarse = flatten("M0 0C0 10 10 10 10 0", 0.5f)->points;
  uint32_t fine = flatten("M0 0C0 10 10 10 10 0", 0.01f)->points;
  CHECK(fine > coarse, "cubic points coarse=%u fine=%u", coarse, fine);
  /* S reflects the previous cubic control point: this S curve is the mirror image. */
  f = flatten("M0 0C0 10 10 10 10 0S20 -10 20 0", 0.01f);
  double min_y = 0;
  for (uint32_t i = 0; i < f->points; i++) if (f->xy[i * 2 + 1] < min_y) min_y = f->xy[i * 2 + 1];
  CHECK(near(min_y, -7.5, 0.02), "S reflection: min y=%g want -7.5", min_y);
}

/* ------------------------------------------------------------ arc conversion */

static void expect_arc(double x1, double y1, double rx, double ry, double rot, int fa, int fs,
                       double x2, double y2, double cx, double cy, double erx, double ery,
                       double t1, double dt) {
  ExpoPicoSvgArcCenter c;
  int rc = expo_pico_svg_arc_center(x1, y1, rx, ry, rot, fa, fs, x2, y2, &c);
  CHECK(rc == 1, "arc rc=%d", rc);
  CHECK(near(c.cx, cx, 1e-9) && near(c.cy, cy, 1e-9), "arc centre (%g, %g) want (%g, %g)", c.cx,
        c.cy, cx, cy);
  CHECK(near(c.rx, erx, 1e-9) && near(c.ry, ery, 1e-9), "arc radii (%g, %g) want (%g, %g)", c.rx,
        c.ry, erx, ery);
  CHECK(near(c.theta1, t1, 1e-9), "arc theta1=%.12f want %.12f", c.theta1, t1);
  CHECK(near(c.delta_theta, dt, 1e-9), "arc dtheta=%.12f want %.12f", c.delta_theta, dt);
}

static void test_arc_conversion(void) {
  /* Half circle, both sweep directions. */
  expect_arc(0, 0, 5, 5, 0, 0, 1, 10, 0, 5, 0, 5, 5, M_PI, M_PI);
  expect_arc(0, 0, 5, 5, 0, 0, 0, 10, 0, 5, 0, 5, 5, M_PI, -M_PI);
  /* Radii too small: scaled up so the arc just reaches (F.6.6). */
  expect_arc(0, 0, 1, 1, 0, 0, 1, 10, 0, 5, 0, 5, 5, M_PI, M_PI);
  /* Quarter circle and its large-arc complement. */
  expect_arc(0, 0, 10, 10, 0, 0, 1, 10, 10, 0, 10, 10, 10, -M_PI / 2, M_PI / 2);
  expect_arc(0, 0, 10, 10, 0, 1, 1, 10, 10, 10, 0, 10, 10, M_PI, 3 * M_PI / 2);
  expect_arc(0, 0, 10, 10, 0, 1, 0, 10, 10, 0, 10, 10, 10, -M_PI / 2, -3 * M_PI / 2);
  /* Negative radii use their absolute value. */
  expect_arc(0, 0, -10, -10, 0, 0, 1, 10, 10, 0, 10, 10, 10, -M_PI / 2, M_PI / 2);
  /* Rotated ellipse: x axis turned 90 degrees, chord along the major axis. */
  {
    ExpoPicoSvgArcCenter c;
    int rc = expo_pico_svg_arc_center(0, 0, 10, 5, 90, 0, 1, 0, 20, &c);
    CHECK(rc == 1 && near(c.cx, 0, 1e-9) && near(c.cy, 10, 1e-9), "rotated arc centre (%g, %g)",
          c.cx, c.cy);
    CHECK(near(fabs(c.delta_theta), M_PI, 1e-6), "rotated arc dtheta=%g", c.delta_theta);
  }
  /* Degenerate arcs. */
  ExpoPicoSvgArcCenter c;
  CHECK(expo_pico_svg_arc_center(0, 0, 0, 5, 0, 0, 1, 10, 0, &c) == 0, "rx=0 must be a line");
  CHECK(expo_pico_svg_arc_center(3, 3, 5, 5, 0, 0, 1, 3, 3, &c) == 0, "equal endpoints omitted");
  CHECK(expo_pico_svg_arc_center(0, 0, 5, 5, 0, 0, 1, 10, 0, NULL) == EXPO_PICO_ICON_ERR_NULL,
        "null out");
}

/* ------------------------------------------------------------------- meshes */

typedef struct {
  int rc;
  uint32_t vcount, icount;
  float *v;
  uint32_t *i;
} Mesh;

static Mesh mesh(const char *svg, float width, float tol) {
  Mesh m = {0};
  m.rc = expo_pico_icon_mesh_size(svg, width, tol, &m.vcount, &m.icount);
  if (m.rc != EXPO_PICO_ICON_OK) return m;
  m.v = calloc(m.vcount * 2 + 2, sizeof(float));
  m.i = calloc(m.icount + 1, sizeof(uint32_t));
  uint32_t fv = 0, fi = 0;
  m.rc = expo_pico_icon_mesh_fill(svg, width, tol, m.v, m.vcount, m.i, m.icount, &fv, &fi);
  CHECK(fv == m.vcount && fi == m.icount, "fill counts %u/%u differ from size %u/%u", fv, fi,
        m.vcount, m.icount);
  return m;
}

static void free_mesh(Mesh *m) {
  free(m->v);
  free(m->i);
}

/* Validates a mesh: finite, inside [lo, hi]^2, indices in range, one winding. */
static int mesh_valid(const Mesh *m, double lo, double hi, const char *what, int report) {
  int ok = m->rc == EXPO_PICO_ICON_OK && m->vcount > 0 && m->icount > 0 && m->icount % 3 == 0;
  for (uint32_t k = 0; ok && k < m->vcount; k++) {
    float x = m->v[k * 2], y = m->v[k * 2 + 1];
    if (!isfinite(x) || !isfinite(y) || x < lo || x > hi || y < lo || y > hi) {
      if (report) fprintf(stderr, "  %s: vertex %u = (%g, %g)\n", what, k, x, y);
      ok = 0;
    }
  }
  for (uint32_t k = 0; ok && k + 2 < m->icount; k += 3) {
    uint32_t a = m->i[k], b = m->i[k + 1], c = m->i[k + 2];
    if (a >= m->vcount || b >= m->vcount || c >= m->vcount) {
      if (report) fprintf(stderr, "  %s: triangle %u index out of range\n", what, k / 3);
      ok = 0;
      break;
    }
    double cross = (m->v[b * 2] - m->v[a * 2]) * (m->v[c * 2 + 1] - m->v[a * 2 + 1]) -
                   (m->v[b * 2 + 1] - m->v[a * 2 + 1]) * (m->v[c * 2] - m->v[a * 2]);
    if (cross > 1e-6) {
      if (report) fprintf(stderr, "  %s: triangle %u wound the wrong way\n", what, k / 3);
      ok = 0;
    }
  }
  return ok;
}

static void test_line_mesh(void) {
  const float tol = 0.05f;
  Mesh m = mesh("<path d=\"M2 12H22\"/>", 2.0f, tol);
  int c = arc_segments(M_PI, arc_step(1.0, tol));
  uint32_t ev = 4 + 2 * (uint32_t)(c + 2), ei = 6 + 6 * (uint32_t)c;
  CHECK(m.rc == 0, "line rc=%d", m.rc);
  CHECK(m.vcount == ev && m.icount == ei, "line counts %u/%u want %u/%u (cap segments %d)",
        m.vcount, m.icount, ev, ei, c);
  CHECK(mesh_valid(&m, 0.999, 23.001, "line", 1), "line mesh invalid");
  double minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
  for (uint32_t k = 0; k < m.vcount; k++) {
    if (m.v[k * 2] < minx) minx = m.v[k * 2];
    if (m.v[k * 2] > maxx) maxx = m.v[k * 2];
    if (m.v[k * 2 + 1] < miny) miny = m.v[k * 2 + 1];
    if (m.v[k * 2 + 1] > maxy) maxy = m.v[k * 2 + 1];
  }
  /* Caps reach x = 1 and 23 to within the chord tolerance; the sides are exact. */
  CHECK(minx >= 1 - 1e-5 && minx <= 1 + tol && maxx <= 23 + 1e-5 && maxx >= 23 - tol &&
            near(miny, 11, 1e-5) && near(maxy, 13, 1e-5),
        "line bounds x[%g, %g] y[%g, %g]", minx, maxx, miny, maxy);
  printf("  line M2 12H22 w=2 tol=%.2f: %u vertices, %u indices (rect 4/6 + 2 caps x %d segments)\n",
         tol, m.vcount, m.icount, c);
  /* <line> must produce the same mesh as the equivalent path. */
  Mesh l = mesh("<line x1=\"2\" y1=\"12\" x2=\"22\" y2=\"12\"/>", 2.0f, tol);
  CHECK(l.vcount == m.vcount && l.icount == m.icount, "<line> counts %u/%u", l.vcount, l.icount);
  free_mesh(&l);

  /* Fill pass with too little room reports ERR_CAPACITY and the required counts. */
  float v[8];
  uint32_t idx[6], fv = 0, fi = 0;
  int rc = expo_pico_icon_mesh_fill("<path d=\"M2 12H22\"/>", 2.0f, tol, v, 4, idx, 6, &fv, &fi);
  CHECK(rc == EXPO_PICO_ICON_ERR_CAPACITY && fv == ev && fi == ei, "capacity rc=%d %u/%u", rc, fv, fi);
  CHECK(expo_pico_icon_mesh_size(NULL, 2, tol, &fv, &fi) == EXPO_PICO_ICON_ERR_NULL, "null svg");
  CHECK(expo_pico_icon_mesh_size("<path d=\"M0 0H1\"/>", 0, tol, &fv, &fi) == EXPO_PICO_ICON_ERR_PARAM,
        "zero width");
  CHECK(expo_pico_icon_mesh_size("<path d=\"M0 0H1\"/>", 2, NAN, &fv, &fi) == EXPO_PICO_ICON_ERR_PARAM,
        "NaN tolerance");
  CHECK(expo_pico_icon_mesh_size("<path d=\"M0 0H\"/>", 2, tol, &fv, &fi) == EXPO_PICO_ICON_ERR_PARSE,
        "bad path data");
  CHECK(expo_pico_icon_mesh_size("<path d=\"M0 0H1\"", 2, tol, &fv, &fi) == EXPO_PICO_ICON_ERR_PARSE,
        "unterminated tag");
  free_mesh(&m);
}

static void test_closed_square(void) {
  const float tol = 0.05f;
  int j = arc_segments(M_PI / 2, arc_step(1.0, tol));
  uint32_t ev = 16 + 4 * (uint32_t)(j + 2), ei = 24 + 12 * (uint32_t)j;
  const char *forms[] = {"<path d=\"M4 4H20V20H4Z\"/>", "<path d=\"M4 4H20V20H4V4z\"/>",
                         "<rect x=\"4\" y=\"4\" width=\"16\" height=\"16\"/>",
                         "<polygon points=\"4,4 20,4 20,20 4,20\"/>"};
  for (int k = 0; k < 4; k++) {
    Mesh m = mesh(forms[k], 2.0f, tol);
    CHECK(m.vcount == ev && m.icount == ei, "%s: %u/%u want %u/%u", forms[k], m.vcount, m.icount,
          ev, ei);
    CHECK(mesh_valid(&m, 2.999, 21.001, forms[k], 1), "%s invalid", forms[k]);
    if (k == 0)
      printf("  closed square: %u vertices, %u indices (4 quads + 4 joins x %d segments, no caps)\n",
             m.vcount, m.icount, j);
    free_mesh(&m);
  }
  /* The open version gets two caps and loses one join. */
  Mesh open = mesh("<polyline points=\"4,4 20,4 20,20 4,20 4,4\"/>", 2.0f, tol);
  int c = arc_segments(M_PI, arc_step(1.0, tol));
  uint32_t ov = 16 + 3 * (uint32_t)(j + 2) + 2 * (uint32_t)(c + 2);
  CHECK(open.vcount == ov, "open square %u vertices want %u", open.vcount, ov);
  free_mesh(&open);
  /* A zero-length subpath with a drawing command paints a round dot. */
  Mesh dot = mesh("<path d=\"M12 12z\"/><path d=\"M5 5L5 5\"/>", 2.0f, tol);
  int full = arc_segments(2 * M_PI, arc_step(1.0, tol));
  CHECK(dot.vcount == 2 * (uint32_t)(full + 2), "dots: %u vertices want %u", dot.vcount,
        2 * (full + 2));
  free_mesh(&dot);
}

/* ------------------------------------------------------------------ icons */

static char *read_file(const char *path) {
  FILE *fp = fopen(path, "rb");
  if (!fp) return NULL;
  fseek(fp, 0, SEEK_END);
  long n = ftell(fp);
  fseek(fp, 0, SEEK_SET);
  char *buf = malloc((size_t)n + 1);
  size_t got = fread(buf, 1, (size_t)n, fp);
  buf[got] = 0;
  fclose(fp);
  return buf;
}

static void dump_mesh(const char *dir, const char *name, const Mesh *m) {
  char path[1024];
  snprintf(path, sizeof path, "%s/%s.json", dir, name);
  FILE *fp = fopen(path, "w");
  if (!fp) return;
  fprintf(fp, "{\"name\":\"%s\",\"vertices\":[", name);
  for (uint32_t k = 0; k < m->vcount * 2; k++) fprintf(fp, "%s%.4f", k ? "," : "", m->v[k]);
  fprintf(fp, "],\"indices\":[");
  for (uint32_t k = 0; k < m->icount; k++) fprintf(fp, "%s%u", k ? "," : "", m->i[k]);
  fprintf(fp, "]}\n");
  fclose(fp);
}

/* Each line: name TAB markup. Returns the number of icons that passed. */
static int run_icons(const char *tsv, const char *out_dir, int check_each, int *total) {
  char *text = read_file(tsv);
  if (!text) {
    fprintf(stderr, "cannot read %s\n", tsv);
    g_failures++;
    return 0;
  }
  int pass = 0;
  *total = 0;
  for (char *line = strtok(text, "\n"); line; line = strtok(NULL, "\n")) {
    char *tab = strchr(line, '\t');
    if (!tab) continue;
    *tab = 0;
    const char *name = line, *markup = tab + 1;
    (*total)++;
    Mesh m = mesh(markup, 2.0f, 0.02f);
    /* Lucide draws on a 24-unit grid; a width-2 stroke may reach 1 unit past it. */
    int ok = mesh_valid(&m, -1.0, 25.0, name, check_each);
    if (check_each) {
      CHECK(ok, "icon %s: rc=%d vertices=%u indices=%u", name, m.rc, m.vcount, m.icount);
      printf("  %-14s %6u vertices %6u indices\n", name, m.vcount, m.icount);
      if (out_dir) dump_mesh(out_dir, name, &m);
    } else if (!ok) {
      fprintf(stderr, "  sweep: %s rc=%d\n", name, m.rc);
    }
    pass += ok;
    free_mesh(&m);
  }
  free(text);
  return pass;
}

int main(int argc, char **argv) {
  if (argc < 3) {
    fprintf(stderr, "usage: %s <icons.tsv> <out-dir> [all-icons.tsv]\n", argv[0]);
    return 2;
  }
  CHECK(expo_pico_icon_abi_version() == EXPO_PICO_ICON_ABI_VERSION, "icon ABI version");
  printf("path parsing\n");
  test_path_parsing();
  printf("arc conversion\n");
  test_arc_conversion();
  printf("stroke meshes\n");
  test_line_mesh();
  test_closed_square();
  printf("lucide icons\n");
  int total = 0;
  int pass = run_icons(argv[1], argv[2], 1, &total);
  CHECK(total == 10, "expected 10 curated icons, got %d", total);
  printf("  %d/%d curated icons valid\n", pass, total);
  if (argc > 3) {
    int all = 0;
    int ok = run_icons(argv[3], NULL, 0, &all);
    printf("  sweep: %d/%d lucide-static icons valid\n", ok, all);
    CHECK(ok == all, "sweep: %d of %d icons failed", all - ok, all);
  }
  printf("%d checks, %d failures\n", g_checks, g_failures);
  return g_failures == 0 ? 0 : 1;
}
