import axios from "axios";
import { api } from "./api";

jest.mock("axios", () => {
  const client = { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() };
  return { create: jest.fn(() => client) };
});

const client = axios.create();

beforeEach(async () => {
  jest.restoreAllMocks();
  client.post.mockResolvedValue({ data: {} });
  await api.authLogout();
  client.get.mockReset();
  client.get.mockResolvedValue({ data: { items: [{ id: "p" }], total_pages: 1 } });
});

afterEach(() => jest.restoreAllMocks());

test("parallel public recommendation reads share one request and return separate arrays", async () => {
  const [a,b] = await Promise.all([api.listAllProducts({cache:true}),api.listAllProducts({cache:true})]);
  expect(client.get).toHaveBeenCalledTimes(1);
  expect(a).toEqual(b);
  expect(a).not.toBe(b);
  expect(client.get.mock.calls[0][1].params).not.toHaveProperty("cache");
});

test("cache expires, and common mutations invalidate it", async () => {
  let now = 1000;
  jest.spyOn(Date,"now").mockImplementation(() => now);
  await api.listAllProducts({cache:true});
  now += 120001;
  await api.listAllProducts({cache:true});
  expect(client.get).toHaveBeenCalledTimes(2);
  client.put.mockResolvedValue({data:{}});
  await api.updateProduct("p",{});
  await api.listAllProducts({cache:true});
  expect(client.get).toHaveBeenCalledTimes(3);
});

test("raw, draft and uncached requests bypass the cache", async () => {
  for (const params of [{cache:true,raw:true},{cache:true,include_drafts:true},{}]) {
    await api.listAllProducts(params);
    await api.listAllProducts(params);
  }
  expect(client.get).toHaveBeenCalledTimes(6);
});

test("failed request can immediately be retried", async () => {
  client.get.mockRejectedValueOnce(new Error("network"));
  await expect(api.listAllProducts({cache:true})).rejects.toThrow("network");
  await expect(api.listAllProducts({cache:true})).resolves.toHaveLength(1);
  expect(client.get).toHaveBeenCalledTimes(2);
});
