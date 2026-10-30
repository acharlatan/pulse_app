import { describe, expect, it } from "vitest";
import type { Task } from "../src/data/models";
import type { AnalyticsReport } from "../src/services/analytics";
import { completionBuckets } from "../src/services/analytics-visual";
import { inAnalyticsBucket } from "../src/services/analytics-guidance";

const task = (id:string, completedAt:string) => ({id,completedAt}) as Task;
const report = (start:string,end:string,days:number,completed:Task[],asOf="2026-10-30T12:00:00Z") => ({range:{start,end,days,previousStart:"",previousEnd:""},completed,asOf}) as Pick<AnalyticsReport,"range"|"completed"|"asOf">;

describe("completion chart buckets", () => {
  it("includes zero days and uses workspace dates, not UTC dates", () => {
    const rows=[task("a","2026-10-29T18:00:00Z"),task("b","2026-10-30T02:00:00Z"),task("future","2026-10-31T03:00:00Z")];
    expect(completionBuckets(report("2026-10-28","2026-10-31",4,rows),"Asia/Manila")).toEqual([["2026-10-28",0],["2026-10-29",0],["2026-10-30",2]]);
  });
  it("groups seven-day spans from the selected first day and excludes later dates", () => {
    const rows=[task("a","2026-10-01T10:00:00Z"),task("b","2026-10-08T10:00:00Z"),task("c","2026-10-30T10:00:00Z"),task("future","2026-11-01T10:00:00Z")];
    const result=completionBuckets(report("2026-10-01","2026-11-30",61,rows),"UTC");
    expect(result).toEqual([["2026-10-01..2026-10-07",1],["2026-10-08..2026-10-14",1],["2026-10-15..2026-10-21",0],["2026-10-22..2026-10-28",0],["2026-10-29..2026-10-30",1]]);
    expect(inAnalyticsBucket(rows[1].completedAt!,result[1][0],"UTC")).toBe(true);
    expect(inAnalyticsBucket(rows[0].completedAt!,result[1][0],"UTC")).toBe(false);
  });
  it("groups long periods by month with no invented completions", () => {
    const result=completionBuckets(report("2026-07-01","2026-10-30",122,[task("a","2026-07-11T00:00:00Z"),task("b","2026-10-01T00:00:00Z")]),"UTC");
    expect(result).toEqual([["2026-07",1],["2026-08",0],["2026-09",0],["2026-10",1]]);
  });
  it("returns no buckets for a future-only period", () => {
    expect(completionBuckets(report("2026-11-01","2026-11-10",10,[]),"UTC")).toEqual([]);
  });
});
