/**
 * G1 — Latest App Bridge compliance (Shopify req 2.2.3, mandatory since
 * 2025-10-15): the served HTML template must load the CDN-hosted
 * `app-bridge.js` as the FIRST script in <head>, preceded by the
 * `shopify-api-key` meta tag that the CDN script reads for auto-init.
 *
 * These tests assert on the template + webpack config as text because
 * the production HTML is produced from exactly these two files
 * (HtmlWebpackPlugin renders src/index.html with templateParameters).
 */
import * as fs from "fs";
import * as path from "path";

const templatePath = path.resolve(__dirname, "../../index.html");
const webpackConfigPath = path.resolve(__dirname, "../../../webpack.config.js");

describe("App Bridge CDN setup (G1)", () => {
  let template: string;

  beforeAll(() => {
    template = fs.readFileSync(templatePath, "utf8");
  });

  describe("index.html template", () => {
    it("includes the shopify-api-key meta tag", () => {
      expect(template).toMatch(
        /<meta\s+name="shopify-api-key"\s+content="<%=\s*SHOPIFY_API_KEY\s*%>"\s*\/?>/,
      );
    });

    it("includes the CDN app-bridge.js script tag", () => {
      expect(template).toMatch(
        /<script\s+src="https:\/\/cdn\.shopify\.com\/shopifycloud\/app-bridge\.js"\s*><\/script>/,
      );
    });

    it("loads app-bridge.js as the FIRST script on the page", () => {
      const firstScript = template.match(/<script[^>]*>/);
      expect(firstScript).not.toBeNull();
      expect((firstScript as RegExpMatchArray)[0]).toContain(
        "https://cdn.shopify.com/shopifycloud/app-bridge.js",
      );
    });

    it("places the app-bridge script inside <head>", () => {
      const headEnd = template.indexOf("</head>");
      const scriptIdx = template.indexOf(
        "https://cdn.shopify.com/shopifycloud/app-bridge.js",
      );
      expect(scriptIdx).toBeGreaterThan(-1);
      expect(scriptIdx).toBeLessThan(headEnd);
    });

    it("places the shopify-api-key meta BEFORE the app-bridge script", () => {
      const metaIdx = template.indexOf('name="shopify-api-key"');
      const scriptIdx = template.indexOf(
        "https://cdn.shopify.com/shopifycloud/app-bridge.js",
      );
      expect(metaIdx).toBeGreaterThan(-1);
      expect(metaIdx).toBeLessThan(scriptIdx);
    });

    it("has no hardcoded bundle.js script (HtmlWebpackPlugin injects the real bundle)", () => {
      // The old hardcoded <script src="bundle.js"> 404s in production
      // (content-hashed filenames) and double-loads in dev.
      expect(template).not.toMatch(/<script\s+src="bundle\.js"/);
    });
  });

  describe("webpack.config.js", () => {
    it("passes SHOPIFY_API_KEY to the HTML template via templateParameters", () => {
      const config = fs.readFileSync(webpackConfigPath, "utf8");
      expect(config).toMatch(/templateParameters/);
      expect(config).toMatch(/SHOPIFY_API_KEY/);
    });
  });
});
