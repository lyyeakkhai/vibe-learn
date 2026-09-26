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

console.log("=== Testing Supabase CRUD Operations ===");
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runTest() {
  const testId = `test_crud_${Date.now()}`;
  const testSlug = `test-crud-slug-${Date.now()}`;

  // 1. CREATE
  console.log("\n1. Testing CREATE course...");
  const newCourse = {
    id: testId,
    slug: testSlug,
    title: "Test CRUD Verification Course",
    summary: "Temporary course created to verify Supabase CRUD operations",
    category: "Web Development",
    level: "beginner",
    price: 19.99,
    popular: false,
    instructor_name: "Test Instructor",
    created_at: new Date().toISOString()
  };

  const { data: created, error: createError } = await supabase
    .from("courses")
    .insert(newCourse)
    .select()
    .single();

  if (createError) {
    console.error("❌ CREATE failed:", createError);
    process.exit(1);
  }
  console.log("✓ CREATE successful:", created.id, created.title);

  // 2. UPDATE
  console.log("\n2. Testing UPDATE course...");
  const { data: updated, error: updateError } = await supabase
    .from("courses")
    .update({ title: "Updated Test CRUD Course", price: 29.99 })
    .eq("id", testId)
    .select()
    .single();

  if (updateError) {
    console.error("❌ UPDATE failed:", updateError);
    process.exit(1);
  }
  console.log("✓ UPDATE successful:", updated.title, "Price:", updated.price);

  // 3. DELETE
  console.log("\n3. Testing DELETE course...");
  const { error: deleteError, count } = await supabase
    .from("courses")
    .delete({ count: "exact" })
    .eq("id", testId);

  if (deleteError) {
    console.error("❌ DELETE failed:", deleteError);
    process.exit(1);
  }
  console.log(`✓ DELETE successful. Deleted count: ${count}`);

  console.log("\n=== ALL SUPABASE CRUD OPERATIONS VERIFIED SUCCESSFULLY ===");
}

runTest().catch((e) => {
  console.error("Test failed with exception:", e);
  process.exit(1);
});
