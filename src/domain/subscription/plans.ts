export type PlanCode = "AGHAZ" | "ROSHD" | "HERFEI" | "SAZMANI" | "NAMAHDOOD";
export type Cycle = "MONTHLY" | "SEMIANNUAL" | "ANNUAL";

export const plans = [
  { code:"AGHAZ", name:"آغاز", monthlyToman:531_000, documentLimit:150 },
  { code:"ROSHD", name:"رشد", monthlyToman:729_000, documentLimit:300 },
  { code:"HERFEI", name:"حرفه‌ای", monthlyToman:1_161_000, documentLimit:600 },
  { code:"SAZMANI", name:"سازمانی", monthlyToman:1_719_000, documentLimit:3000 },
  { code:"NAMAHDOOD", name:"نامحدود", monthlyToman:2_331_000, documentLimit:null },
] as const;

export function cyclePrice(monthlyToman:number, cycle:Cycle){
  if(cycle==="MONTHLY") return monthlyToman;
  if(cycle==="SEMIANNUAL") return Math.round(monthlyToman*6*0.9);
  return Math.round(monthlyToman*12*0.8);
}
export function trialEndsAt(start:Date){ return new Date(start.getTime()+15*24*60*60*1000); }
export function entitlement(status:string, trialEnd:Date, now=new Date()){
  if(status==="ACTIVE") return {canRead:true,canWrite:true,reason:"ACTIVE"};
  if(status==="TRIALING" && trialEnd.getTime()>now.getTime()) return {canRead:true,canWrite:true,reason:"TRIAL"};
  return {canRead:true,canWrite:false,reason:"SUBSCRIPTION_REQUIRED"};
}
export function trialDaysRemaining(end:Date, now=new Date()){
  return Math.max(0,Math.ceil((end.getTime()-now.getTime())/(24*60*60*1000)));
}
