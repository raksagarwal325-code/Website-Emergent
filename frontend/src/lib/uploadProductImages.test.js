import { uploadProductImages } from "./uploadProductImages";

describe("uploadProductImages", () => {
  test("uploads every selected image and preserves selection order", async () => {
    const files = [{ name: "one.jpg" }, { name: "two.jpg" }, { name: "three.jpg" }];
    const uploadOne = jest.fn(async (file) => ({ url: `/uploads/${file.name}` }));

    const result = await uploadProductImages(files, uploadOne);

    expect(uploadOne).toHaveBeenCalledTimes(3);
    expect(result).toEqual({
      urls: ["/uploads/one.jpg", "/uploads/two.jpg", "/uploads/three.jpg"],
      failed: 0,
      total: 3,
    });
  });

  test("keeps successful uploads when another image fails", async () => {
    const files = [{ name: "one.jpg" }, { name: "bad.jpg" }, { name: "three.jpg" }];
    const uploadOne = jest.fn(async (file) => {
      if (file.name === "bad.jpg") throw new Error("upload failed");
      return { url: `/uploads/${file.name}` };
    });

    const result = await uploadProductImages(files, uploadOne);

    expect(result).toEqual({
      urls: ["/uploads/one.jpg", "/uploads/three.jpg"],
      failed: 1,
      total: 3,
    });
  });

  test("does nothing when no files are selected", async () => {
    const uploadOne = jest.fn();
    await expect(uploadProductImages([], uploadOne)).resolves.toEqual({ urls: [], failed: 0, total: 0 });
    expect(uploadOne).not.toHaveBeenCalled();
  });
});
