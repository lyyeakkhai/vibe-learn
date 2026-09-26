import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

// Load .env
const envPath = path.join(rootDir, ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (key && rest.length) {
      process.env[key.trim()] = rest.join("=").trim();
    }
  }
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verify() {
  console.log("=== 1. Checking existing courses in Supabase ===");
  const { data: courses, error } = await supabase.from("courses").select("id, slug, title, price, cover_image_url");
  if (error) throw error;
  console.log("Found courses in Supabase:", courses);

  console.log("\n=== 2. Creating a test course ===");
  const testId = `course_test_${Date.now()}`;
  const testSlug = `test-course-${Date.now()}`;
  const { data: created, error: createErr } = await supabase
    .from("courses")
    .insert({
      id: testId,
      slug: testSlug,
      title: "Verifying Live Supabase Integration",
      price: 49.99,
      category: "Web Development",
      summary: "Testing create",
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (createErr) throw createErr;
  console.log("✓ Created course successfully with ID:", created.id);

  console.log("\n=== 3. Testing UPDATE by ID ===");
  const { data: updatedById, error: updateByIdErr } = await supabase
    .from("courses")
    .update({ title: "Updated via ID", price: 79.99 })
    .eq("id", testId)
    .select()
    .single();

  if (updateByIdErr) throw updateByIdErr;
  console.log("✓ Updated by ID:", updatedById.title, "New Price:", updatedById.price);

  console.log("\n=== 4. Testing UPDATE by SLUG ===");
  const { data: updatedBySlug, error: updateBySlugErr } = await supabase
    .from("courses")
    .update({ title: "Updated via Slug", price: 99.99 })
    .eq("slug", testSlug)
    .select()
    .single();

  if (updateBySlugErr) throw updateBySlugErr;
  console.log("✓ Updated by Slug:", updatedBySlug.title, "New Price:", updatedBySlug.price);

  console.log("\n=== 5. Testing DELETE by ID ===");
  const { error: deleteErr, count } = await supabase
    .from("courses")
    .delete({ count: "exact" })
    .eq("id", testId);

  if (deleteErr) throw deleteErr;
  console.log("✓ Deleted successfully! Count deleted:", count);

  console.log("\n=== ALL DATABASE OPERATIONS VERIFIED 100% OPERATIONAL ===");
}

verify().catch((e) => {
  console.error("Verification failed:", e);
  process.exit(1);
});
