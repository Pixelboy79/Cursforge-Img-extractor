const express = require("express");
const cors = require("cors");
const { chromium } = require("playwright");

const app = express();

app.use(cors());
app.use(express.json());

app.post("/extract", async (req, res) => {

    const { url } = req.body;

    if (!url) {
        return res.status(400).json({
            success: false,
            error: "URL required"
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

        const page = await browser.newPage();

        await page.goto(url, {
            waitUntil: "networkidle",
            timeout: 60000
        });

        // Give lazy-loaded images time to appear
        await page.waitForTimeout(3000);

        const images = await page.evaluate(() => {

            return [...new Set(
                [...document.querySelectorAll("img")]
                    .map(img => img.src)
                    .filter(Boolean)
            )];

        });

        return res.json({
            success: true,
            count: images.length,
            images
        });

    } catch (e) {

        console.error(e);

        return res.status(500).json({
            success: false,
            error: e.message
        });

    } finally {

        if (browser) {
            await browser.close();
        }

    }

});

app.get("/", (req, res) => {
    res.json({
        status: "Online",
        message: "CurseForge Image Extractor API",
        endpoint: "POST /extract"
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
