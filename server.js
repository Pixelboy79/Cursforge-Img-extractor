const express = require("express");
const cors = require("cors");
const { chromium } = require("playwright");

const app = express();

app.use(cors());
app.use(express.json());

app.post("/extract", async (req, res) => {

    const { url } = req.body;

    if (!url)
        return res.status(400).json({ error: "URL required" });

    const browser = await chromium.launch({
        headless: true
    });

    try {

        const page = await browser.newPage();

        await page.goto(url, {
            waitUntil: "networkidle",
            timeout: 60000
        });

        // Wait a little for lazy-loaded images
        await page.waitForTimeout(3000);

        const images = await page.evaluate(() => {

            return [...new Set(
                [...document.querySelectorAll("img")]
                    .map(img => img.src)
                    .filter(Boolean)
            )];

        });

        res.json({
            success: true,
            count: images.length,
            images
        });

    } catch (e) {

        res.status(500).json({
            success: false,
            error: e.message
        });

    } finally {

        await browser.close();

    }

});

app.listen(process.env.PORT || 3000, () => {
    console.log("Running...");
});
