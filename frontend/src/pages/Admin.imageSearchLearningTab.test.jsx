import fs from "fs";
import path from "path";

test("admin manages learned examples inside the existing image search", () => {
  const admin = fs.readFileSync(path.join(__dirname, "Admin.jsx"), "utf8");
  const panel = fs.readFileSync(path.join(__dirname, "../components/admin/ImageSearchLearningAdmin.jsx"), "utf8");
  const api = fs.readFileSync(path.join(__dirname, "../lib/api.js"), "utf8");

  expect(admin).toContain('{ key: "image-search", label: "Image Search"');
  expect(admin).toContain("<ImageSearchLearningAdmin products={products} />");
  expect(panel).toContain("Add to existing search");
  expect(panel).toContain("select every correct catalogue product");
  expect(api).toContain("adminAddImageSearchReference");
  expect(api).toContain("adminDeleteImageSearchReference");
});
