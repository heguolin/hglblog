import { Injectable } from "@nestjs/common";
import * as os from "os";

// 缓存 3 秒，避免频繁计算 CPU
let cached: { data: SystemStatus; time: number } | null = null;

export interface SystemStatus {
  cpu: { usage: number; cores: number; model: string };
  memory: { used: number; total: number; usage: number };
  uptime: number;
  loadavg: number[];
  platform: string;
  nodeVersion: string;
  runningDays: number;
}

function getCpuUsage(): Promise<number> {
  return new Promise((resolve) => {
    const start = os.cpus();
    setTimeout(() => {
      const end = os.cpus();
      let totalDiff = 0, idleDiff = 0;
      for (let i = 0; i < start.length; i++) {
        const s = start[i].times, e = end[i].times;
        const sTotal = s.user + s.nice + s.sys + s.idle + s.irq;
        const eTotal = e.user + e.nice + e.sys + e.idle + e.irq;
        totalDiff += eTotal - sTotal;
        idleDiff += e.idle - s.idle;
      }
      resolve(totalDiff > 0 ? Math.round(((totalDiff - idleDiff) / totalDiff) * 100) : 0);
    }, 200);
  });
}

@Injectable()
export class SystemService {
  async getStatus(): Promise<SystemStatus> {
    if (cached && Date.now() - cached.time < 3000) return cached.data;

    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const cpuUsage = await getCpuUsage();
    const startDate = new Date("2026-06-05");

    const data: SystemStatus = {
      cpu: { usage: cpuUsage, cores: os.cpus().length, model: os.cpus()[0]?.model ?? "Unknown" },
      memory: { used: usedMem, total: totalMem, usage: Math.round((usedMem / totalMem) * 100) },
      uptime: Math.floor(os.uptime()),
      loadavg: os.loadavg().map((v) => Math.round(v * 100) / 100),
      platform: `${os.type()} ${os.release()}`,
      nodeVersion: process.version,
      runningDays: Math.floor((Date.now() - startDate.getTime()) / 86400000),
    };

    cached = { data, time: Date.now() };
    return data;
  }
}
