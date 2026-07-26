const express = require("express");
const cors = require("cors");
const { chromium } = require("playwright");

const app = express();

app.use(cors());
app.use(express.json());

// Home
app.get("/", (req, res) => {
    res.json({
        success: true,
        status: "Online",
        service: "CurseForge Screenshot Extractor",
        endpoint: "POST /extract"
    });
});

// Health Check
app.get("/health", (req, res) => {
    res.json({
        success: true,
        status: "healthy"
    });
});

// Extract Screenshots
app.post("/extract", async (req, res) => {

    const { url } = req.body;

    if (!url) {
        return res.status(400).json({
            success: false,
            error: "URL is required"
        });
    }

    let browser;

    try {

        browser = await chromium.launch({
            headless: true,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage"
            ]
        });

        const page = await browser.newPage({
            viewport: {
                width: 1366,
                height: 768
            }
        });

        await page.goto(url, {
            waitUntil: "networkidle",
            timeout: 60000
        });

        // Allow lazy-loaded images to appear
        await page.waitForTimeout(2000);

        // Scroll to bottom once
        await page.evaluate(async () => {
            await new Promise(resolve => {

                let totalHeight = 0;
                const distance = 800;

                const timer = setInterval(() => {

                    window.scrollBy(0, distance);
                    totalHeight += distance;

                    if (totalHeight >= document.body.scrollHeight) {
                        clearInterval(timer);
                        resolve();
                    }

                }, 200);

            });
        });

        await page.waitForTimeout(1500);

        const screenshots = await page.evaluate(() => {

            const urls = new Set();

            // IMG tags
            document.querySelectorAll("img").forEach(img => {

                const src = img.currentSrc || img.src;

                if (
                    src &&
                    src.includes("https://media.forgecdn.net/attachments/")
                ) {
                    urls.add(src.split("?")[0]);
                }

            });

            // Preloaded images
            document.querySelectorAll('link[rel="preload"][as="image"]').forEach(link => {

                const href = link.href;

                if (
                    href &&
                    href.includes("https://media.forgecdn.net/attachments/")
                ) {
                    urls.add(href.split("?")[0]);
                }

            });

            // Direct links
            document.querySelectorAll("a").forEach(a => {

                const href = a.href;

                if (
                    href &&
                    href.includes("https://media.forgecdn.net/attachments/")
                ) {
                    urls.add(href.split("?")[0]);
                }

            });

            return Array.from(urls);

        });

        screenshots.sort();

        return res.json({
            success: true,
            count: screenshots.length,
            screenshots
        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            success: false,
            error: err.message
        });

    } finally {

        if (browser) {
            await browser.close();
        }

    }

});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
