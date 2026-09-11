"use server";

import { requirePermission } from "@/core/tenant/rbac";
import * as b2bService from "./b2b-service";
import {
  CreateB2bCompanySchema,
  AddB2bUserSchema,
  CreateB2bPriceListSchema,
  SubmitB2bOrderSchema,
} from "./types";

export async function createCompanyAction(formData: unknown) {
  const parsed = CreateB2bCompanySchema.parse(formData);
  const ctx = await requirePermission("b2b:write", parsed.storeId);
  return await b2bService.createCompany(parsed, ctx.user.id);
}

export async function addCompanyUserAction(formData: unknown) {
  const parsed = AddB2bUserSchema.parse(formData);
  const ctx = await requirePermission("b2b:write", parsed.storeId);
  return await b2bService.addCompanyUser(parsed, ctx.user.id);
}

export async function createPriceListAction(formData: unknown) {
  const parsed = CreateB2bPriceListSchema.parse(formData);
  const ctx = await requirePermission("b2b:write", parsed.storeId);
  return await b2bService.createPriceList(parsed, ctx.user.id);
}

export async function submitB2bOrderAction(formData: unknown) {
  const parsed = SubmitB2bOrderSchema.parse(formData);
  const ctx = await requirePermission("b2b:write", parsed.storeId);
  return await b2bService.submitB2bOrder(parsed, ctx.user.id);
}

export async function approveB2bOrderAction(storeId: string, b2bOrderId: string) {
  const ctx = await requirePermission("b2b:write", storeId);
  return await b2bService.approveB2bOrder(storeId, b2bOrderId, ctx.user.id);
}

export async function listCompaniesAction(storeId: string) {
  await requirePermission("b2b:read", storeId);
  return await b2bService.listCompanies(storeId);
}

export async function listB2bOrdersAction(storeId: string) {
  await requirePermission("b2b:read", storeId);
  return await b2bService.listB2bOrders(storeId);
}
