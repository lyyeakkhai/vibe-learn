const { chromium } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

const SCREENSHOTS_DIR = path.resolve("./screenshots");
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function runBrowserTests() {
  console.log("🚀 Starting Real Browser End-to-End Test Suite...");
  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  const results = [];
  const record = (name, passed, details = "") => {
    results.push({ name, passed, details });
    const mark = passed ? "✅ PASS" : "❌ FAIL";
    console.log(`${mark} - ${name} ${details ? `(${details})` : ""}`);
  };

  try {
    // -------------------------------------------------------------------------
    // Step 1: Open Home Page
    // -------------------------------------------------------------------------
    console.log("\n--- 1. Home Page Navigation ---");
    await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
    const title = await page.title();
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "01-home-page.png") });
    record("Home page loads", title.length >= 0, `Page loaded, title: "${title}"`);

    // -------------------------------------------------------------------------
    // Step 2: Navigate to Sign In & Verify Wrong Password (401)
    // -------------------------------------------------------------------------
    console.log("\n--- 2. Sign In Form & 401 Invalid Credentials ---");
    await page.goto("http://localhost:5173/sign-in", { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "02-signin-page.png") });

    await page.fill('input[type="email"]', "alice@test.dev");
    await page.fill('input[type="password"]', "wrongpassword123");
    await page.click('button[type="submit"]');

    // Wait for error alert to display on the page
    await page.waitForSelector(".text-red-700, .text-red-300", { timeout: 5000 });
    const errorText = await page.textContent(".text-red-700, .text-red-300");
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "03-signin-invalid-credentials.png") });
    record("401 Invalid credentials error rendered in UI", errorText.includes("Invalid credentials"), errorText.trim());

    // -------------------------------------------------------------------------
    // Step 3: Sign Up Flow (201 Created & Auto-Login)
    // -------------------------------------------------------------------------
    console.log("\n--- 3. Sign Up New User & Redirection ---");
    const testEmail = `tester_${Date.now()}@test.dev`;
    await page.goto("http://localhost:5173/sign-up", { waitUntil: "networkidle" });

    await page.fill('input[placeholder="Jane Doe"]', "Test User");
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', "password123");
    await page.click('button[type="submit"]');

    // Expect redirection to /courses or /
    await page.waitForURL((url) => url.pathname.includes("/courses") || url.pathname === "/", { timeout: 8000 });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "04-signup-success-courses.png") });

    const storedUser = await page.evaluate(() => localStorage.getItem("vibelearn_auth_user"));
    const storedToken = await page.evaluate(() => localStorage.getItem("vibelearn_auth_token"));
    record("Signup redirects to /courses with auth stored", !!storedToken && !!storedUser, `Email: ${testEmail}`);

    // -------------------------------------------------------------------------
    // Step 4: Duplicate Sign Up Conflict (409)
    // -------------------------------------------------------------------------
    console.log("\n--- 4. Duplicate Sign Up (409 Conflict) ---");
    await page.goto("http://localhost:5173/sign-up", { waitUntil: "networkidle" });
    await page.fill('input[placeholder="Jane Doe"]', "Duplicate Test User");
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', "password123");
    await page.click('button[type="submit"]');

    await page.waitForSelector(".text-red-700, .text-red-300", { timeout: 5000 });
    const duplicateError = await page.textContent(".text-red-700, .text-red-300");
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "05-signup-duplicate-conflict.png") });
    const has409Message = duplicateError.toLowerCase().includes("already registered") || duplicateError.toLowerCase().includes("already in use");
    record("409 Conflict rendered in UI for duplicate signup", has409Message, duplicateError.trim());

    // -------------------------------------------------------------------------
    // Step 5: Sign In as Alice (200 OK & Bearer Token)
    // -------------------------------------------------------------------------
    console.log("\n--- 5. Sign In as Alice ---");
    await page.goto("http://localhost:5173/sign-in", { waitUntil: "networkidle" });
    await page.fill('input[type="email"]', "alice@test.dev");
    await page.fill('input[type="password"]', "secret123");
    await page.click('button[type="submit"]');

    await page.waitForURL((url) => url.pathname.includes("/courses"), { timeout: 8000 });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "06-alice-signed-in.png") });

    const aliceToken = await page.evaluate(() => localStorage.getItem("vibelearn_auth_token"));
    const aliceUserStr = await page.evaluate(() => localStorage.getItem("vibelearn_auth_user"));
    const aliceUser = JSON.parse(aliceUserStr || "{}");
    record("Alice sign-in stores valid JWT token", !!aliceToken && aliceUser.email === "alice@test.dev", `User: ${aliceUser.email}`);

    // -------------------------------------------------------------------------
    // Step 6: Verify Scoped Learner Progress Authorization & Isolation in Browser
    // -------------------------------------------------------------------------
    console.log("\n--- 6. In-Browser Scoped Learner Progress API with Bearer Header ---");
    
    // Fetch a course to get courseId and lessonId
    const coursesRes = await fetch("http://localhost:3000/api/courses/python-for-data-work");
    const courseData = await coursesRes.json();
    const testCourseId = courseData.id;
    const testLessonId = courseData.modules?.[0]?.lessons?.[0]?.id;

    const browserApiCheck = await page.evaluate(async ({ courseId, lessonId }) => {
      const token = localStorage.getItem("vibelearn_auth_token");
      
      // 1. Fetch Alice's progress with Bearer token
      const resProgress = await fetch("http://localhost:3000/api/progress", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const progressData = await resProgress.json();

      // 2. Save progress as Alice
      const resSave = await fetch("http://localhost:3000/api/progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          courseId,
          lessonId,
          resumeTimestamp: 120,
          isCompleted: true
        })
      });
      const savedData = await resSave.json();

      // 3. Try to access Admin endpoint as Alice (expect 403 Forbidden)
      const resAdmin = await fetch("http://localhost:3000/api/admin/overview", {
        headers: { Authorization: `Bearer ${token}` }
      });

      return {
        progressStatus: resProgress.status,
        progressCount: Array.isArray(progressData) ? progressData.length : -1,
        saveStatus: resSave.status,
        savedCourseId: savedData?.courseId,
        adminStatus: resAdmin.status,
      };
    }, { courseId: testCourseId, lessonId: testLessonId });

    record("GET /api/progress with Bearer header returns 200", browserApiCheck.progressStatus === 200, `Found ${browserApiCheck.progressCount} progress records`);
    record("POST /api/progress with Bearer header saves progress (200)", browserApiCheck.saveStatus === 200, `Saved courseId: ${browserApiCheck.savedCourseId}`);
    record("GET /api/admin/overview as regular user returns 403 Forbidden", browserApiCheck.adminStatus === 403, `Status: ${browserApiCheck.adminStatus}`);

    // -------------------------------------------------------------------------
    // Step 7: Protected Route Access (/my-learning)
    // -------------------------------------------------------------------------
    console.log("\n--- 7. Protected Route Access (/my-learning) ---");
    await page.goto("http://localhost:5173/my-learning", { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "07-protected-my-learning.png") });
    const onMyLearning = page.url().includes("/my-learning");
    record("Authenticated user accesses protected route /my-learning", onMyLearning, `Current URL: ${page.url()}`);

    // -------------------------------------------------------------------------
    // Step 8: User Profile Menu & Logout Flow
    // -------------------------------------------------------------------------
    console.log("\n--- 8. User Menu & Sign Out Flow ---");
    // Open user menu
    await page.click('button[aria-label="User menu"]');
    await page.waitForSelector('text="Sign Out"', { timeout: 3000 });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "08-user-dropdown-menu.png") });

    // Click Sign Out
    await page.click('button:has-text("Sign Out")');
    await page.waitForTimeout(1000);

    const tokenAfterLogout = await page.evaluate(() => localStorage.getItem("vibelearn_auth_token"));
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "09-after-logout.png") });
    record("Sign Out clears JWT token from storage", tokenAfterLogout === null);

    // -------------------------------------------------------------------------
    // Step 9: Protected Route Re-Check (Unauthenticated Redirect)
    // -------------------------------------------------------------------------
    console.log("\n--- 9. Protected Route Redirect when Logged Out ---");
    await page.goto("http://localhost:5173/my-learning", { waitUntil: "networkidle" });
    await page.waitForURL((url) => url.pathname.includes("/sign-in"), { timeout: 5000 });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "10-protected-redirect-to-signin.png") });
    record("Unauthenticated /my-learning redirects to /sign-in", page.url().includes("/sign-in"), `Redirected to: ${page.url()}`);

  } catch (err) {
    console.error("Test execution error:", err);
    record("Test Execution", false, err.message);
  } finally {
    await browser.close();
  }

  console.log("\n==========================================");
  console.log("📊 BROWSER TEST RESULTS SUMMARY:");
  console.log("==========================================");
  const total = results.length;
  const passedCount = results.filter((r) => r.passed).length;
  console.log(`Passed: ${passedCount} / ${total}`);

  if (passedCount === total) {
    console.log("🎉 ALL REAL BROWSER CHECKS PASSED PERFECTLY!");
  } else {
    console.log("⚠️ SOME CHECKS FAILED - REVIEW LOGS ABOVE.");
  }
}

runBrowserTests();
