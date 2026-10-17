const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const rootDir = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(rootDir, '.env') });
dotenv.config({ path: path.join(rootDir, 'backend', '.env') });

const cloudinary = require(path.join(rootDir, 'backend', 'node_modules', 'cloudinary')).v2;
const { Client } = require(path.join(rootDir, 'backend', 'node_modules', 'pg'));

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
const DATABASE_URL = process.env.DATABASE_URL;

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.error('Missing Cloudinary credentials in environment.');
  process.exit(1);
}

if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL in environment.');
  process.exit(1);
}

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: true,
});

const courseImageMap = [
  {
    slug: 'nextjs-app-router-in-depth',
    file: 'nextjs.jpg',
  },
  {
    slug: 'react-performance-engineering',
    file: 'react.jpg',
  },
  {
    slug: 'typescript-for-application-developers',
    file: 'typescript.jpg',
  },
  {
    slug: 'building-ai-apps-with-llms',
    file: 'ai-llms.jpg',
  },
  {
    slug: 'retrieval-augmented-generation-from-scratch',
    file: 'rag.jpg',
  },
  {
    slug: 'python-for-data-work',
    file: 'python.jpg',
  },
  {
    slug: 'system-design-foundations',
    file: 'system-design.jpg',
  },
  {
    slug: 'postgresql-for-developers',
    file: 'postgresql.jpg',
  },
  {
    slug: 'devops-with-docker-and-kubernetes',
    file: 'devops.jpg',
  },
  {
    slug: 'practical-web-security',
    file: 'web-security.jpg',
  },
];

async function uploadToCloudinary(filePath, publicId) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      filePath,
      {
        folder: 'vibelearn/courses',
        public_id: publicId,
        overwrite: true,
        resource_type: 'image',
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
  });
}

async function main() {
  console.log('--- Step 1: Uploading Course Logos to Cloudinary ---');
  const uploadedUrls = new Map();

  for (const item of courseImageMap) {
    const fullPath = path.join(rootDir, 'frontend', 'src', 'assets', 'courses', item.file);
    if (!fs.existsSync(fullPath)) {
      console.warn(`File not found: ${fullPath}`);
      continue;
    }

    console.log(`Uploading ${item.file} for ${item.slug}...`);
    try {
      const res = await uploadToCloudinary(fullPath, item.slug);
      console.log(`✓ Uploaded: ${res.secure_url}`);
      uploadedUrls.set(item.slug, res.secure_url);
    } catch (err) {
      console.error(`✗ Failed to upload ${item.file}:`, err.message);
    }
  }

  console.log(`\nSuccessfully uploaded ${uploadedUrls.size} images to Cloudinary.`);

  console.log('\n--- Step 2: Updating Supabase Database ---');
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('Connected to Supabase PostgreSQL database.');

  for (const [slug, secureUrl] of uploadedUrls.entries()) {
    const updateRes = await client.query(
      'UPDATE courses SET cover_image_url = $1 WHERE slug = $2 RETURNING id, title, slug, cover_image_url;',
      [secureUrl, slug]
    );
    if (updateRes.rowCount > 0) {
      console.log(`✓ Updated DB course "${updateRes.rows[0].title}": ${secureUrl}`);
    } else {
      console.warn(`! No course found with slug "${slug}"`);
    }
  }

  await client.end();
  console.log('Database update completed.');

  console.log('\n--- Step 3: Updating seed.sql and seed.ndjson ---');
  const seedSqlPath = path.join(rootDir, 'supabase', 'seed.sql');
  if (fs.existsSync(seedSqlPath)) {
    let sqlContent = fs.readFileSync(seedSqlPath, 'utf8');
    for (const [slug, secureUrl] of uploadedUrls.entries()) {
      const picsumRegex = new RegExp(
        `https:\\/\\/picsum\\.photos\\/seed\\/vertex-${slug}\\/1600\\/900`,
        'g'
      );
      sqlContent = sqlContent.replace(picsumRegex, secureUrl);
    }
    fs.writeFileSync(seedSqlPath, sqlContent, 'utf8');
    console.log('✓ Updated supabase/seed.sql');
  }

  const ndjsonPaths = [
    path.join(rootDir, 'docs', 'seed.ndjson'),
    path.join(rootDir, 'backend', 'docs', 'seed.ndjson'),
  ];

  for (const p of ndjsonPaths) {
    if (fs.existsSync(p)) {
      let content = fs.readFileSync(p, 'utf8');
      for (const [slug, secureUrl] of uploadedUrls.entries()) {
        const picsumRegex = new RegExp(
          `https:\\/\\/picsum\\.photos\\/seed\\/vertex-${slug}\\/1600\\/900`,
          'g'
        );
        content = content.replace(picsumRegex, secureUrl);
      }
      fs.writeFileSync(p, content, 'utf8');
      console.log(`✓ Updated ${path.relative(rootDir, p)}`);
    }
  }

  console.log('\n--- All tasks completed successfully! ---');
}

main().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
