jest.mock("mongodb", () => ({
  ObjectId: {
    isValid: jest.fn(() => true),
  },
}));

jest.mock("@/server/lib/mongodb", () => ({
  getMongoDb: jest.fn(),
}));

import {
  compareAppVersions,
  listActiveSystemAnnouncements,
} from "@/server/models/system-announcement";
import { getMongoDb } from "@/server/lib/mongodb";

describe("system announcement model", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("compares semantic-ish app versions correctly", () => {
    expect(compareAppVersions("2.0.0", "2.0.0")).toBe(0);
    expect(compareAppVersions("2.1.0", "2.0.9")).toBeGreaterThan(0);
    expect(compareAppVersions("2.0.0", "2.1.0")).toBeLessThan(0);
    expect(compareAppVersions("2.0", "2.0.1")).toBeLessThan(0);
  });

  it("filters active announcements by environment, time window, and app version", async () => {
    const toArray = jest.fn().mockResolvedValue([
      {
        _id: { toString: () => "announcement-1" },
        title: "Visible",
        body: "Shown in preview for 2.0.x",
        kind: "feature",
        severity: "info",
        isActive: true,
        environment: "preview",
        minAppVersion: "2.0.0",
        maxAppVersion: "2.0.9",
        createdAt: new Date("2026-03-19T10:00:00.000Z"),
        updatedAt: new Date("2026-03-19T10:00:00.000Z"),
      },
      {
        _id: { toString: () => "announcement-2" },
        title: "Too New",
        body: "Requires a newer version",
        kind: "feature",
        severity: "info",
        isActive: true,
        environment: "preview",
        minAppVersion: "2.1.0",
        createdAt: new Date("2026-03-19T10:00:00.000Z"),
        updatedAt: new Date("2026-03-19T10:00:00.000Z"),
      },
    ]);

    const sort = jest.fn(() => ({ toArray }));
    const find = jest.fn(() => ({ sort }));
    const createIndex = jest.fn().mockResolvedValue("index");
    (getMongoDb as jest.Mock).mockResolvedValue({
      collection: jest.fn(() => ({
        createIndex,
        find,
      })),
    });

    const result = await listActiveSystemAnnouncements({
      appVersion: "2.0.0",
      environment: "preview",
      now: new Date("2026-03-19T12:00:00.000Z"),
    });

    expect(find).toHaveBeenCalledWith({
      isActive: true,
      environment: { $in: ["all", "preview"] },
      $and: [
        {
          $or: [{ startsAt: { $exists: false } }, { startsAt: null }, { startsAt: { $lte: new Date("2026-03-19T12:00:00.000Z") } }],
        },
        {
          $or: [{ endsAt: { $exists: false } }, { endsAt: null }, { endsAt: { $gte: new Date("2026-03-19T12:00:00.000Z") } }],
        },
      ],
    });
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Visible");
  });
});
