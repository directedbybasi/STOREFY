"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Award,
  Sparkles,
  Clock,
  UserPlus,
  MapPin,
  Plus,
  Trash2,
  Edit2,
  ShoppingBag,
  Star,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  type CustomerSegment,
  type CustomerStatus,
  type AddressType,
  updateCustomerAction,
  archiveCustomerAction,
  createCustomerAddressAction,
  updateCustomerAddressAction,
  deleteCustomerAddressAction,
  setDefaultAddressAction,
} from "@/modules/customers";

interface CustomerDetailClientProps {
  data: {
    customer: {
      id: string;
      storeId: string;
      firstName: string | null;
      lastName: string | null;
      fullName: string;
      email: string | null;
      phone: string | null;
      status: string;
      notes: string | null;
      totalSpent: number;
      ordersCount: number;
      lastOrderAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
      segment: CustomerSegment;
    };
    metrics: {
      ordersCount: number;
      totalSpentPaise: bigint;
      totalSpentFormatted: string;
      averageOrderValuePaise: bigint;
      averageOrderValueFormatted: string;
      lastOrderAt: Date | null;
    };
    addresses: Array<{
      id: string;
      name: string;
      phone: string;
      addressLine1: string;
      addressLine2: string | null;
      city: string;
      state: string;
      postalCode: string;
      country: string;
      isDefault: boolean;
      type: string | null;
      createdAt: Date;
    }>;
    orders: unknown[];
  };
}

export function CustomerDetailClient({ data }: CustomerDetailClientProps) {
  const router = useRouter();
  const { customer, metrics, addresses } = data;

  // Edit Customer Modal State
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [firstName, setFirstName] = useState(customer.firstName || "");
  const [lastName, setLastName] = useState(customer.lastName || "");
  const [email, setEmail] = useState(customer.email || "");
  const [phone, setPhone] = useState(customer.phone || "");
  const [status, setStatus] = useState<CustomerStatus>(
    (customer.status as CustomerStatus) || "ACTIVE"
  );
  const [notes, setNotes] = useState(customer.notes || "");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Address Modal State
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addrName, setAddrName] = useState("");
  const [addrPhone, setAddrPhone] = useState("");
  const [addrLine1, setAddrLine1] = useState("");
  const [addrLine2, setAddrLine2] = useState("");
  const [addrCity, setAddrCity] = useState("");
  const [addrState, setAddrState] = useState("");
  const [addrPostal, setAddrPostal] = useState("");
  const [addrCountry, setAddrCountry] = useState("India");
  const [addrIsDefault, setAddrIsDefault] = useState(false);
  const [addrType, setAddrType] = useState<AddressType>("SHIPPING");
  const [addrError, setAddrError] = useState<string | null>(null);
  const [isSavingAddr, setIsSavingAddr] = useState(false);

  // Open Create Address Modal
  function handleOpenCreateAddress() {
    setEditingAddressId(null);
    setAddrName(customer.fullName !== "Guest Customer" ? customer.fullName : "");
    setAddrPhone(customer.phone || "");
    setAddrLine1("");
    setAddrLine2("");
    setAddrCity("");
    setAddrState("");
    setAddrPostal("");
    setAddrCountry("India");
    setAddrIsDefault(addresses.length === 0);
    setAddrType("SHIPPING");
    setAddrError(null);
    setAddressModalOpen(true);
  }

  // Open Edit Address Modal
  function handleOpenEditAddress(addr: (typeof addresses)[number]) {
    setEditingAddressId(addr.id);
    setAddrName(addr.name);
    setAddrPhone(addr.phone);
    setAddrLine1(addr.addressLine1);
    setAddrLine2(addr.addressLine2 || "");
    setAddrCity(addr.city);
    setAddrState(addr.state);
    setAddrPostal(addr.postalCode);
    setAddrCountry(addr.country);
    setAddrIsDefault(addr.isDefault);
    setAddrType((addr.type as AddressType) || "SHIPPING");
    setAddrError(null);
    setAddressModalOpen(true);
  }

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim()) {
      setProfileError("First name is required");
      return;
    }

    setProfileError(null);
    setIsSavingProfile(true);
    try {
      await updateCustomerAction({
        id: customer.id,
        firstName: firstName.trim(),
        lastName: lastName.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        status,
        notes: notes.trim() || null,
      });

      setEditProfileOpen(false);
      router.refresh();
    } catch (err: unknown) {
      setProfileError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleAddressSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!addrName.trim() || !addrPhone.trim() || !addrLine1.trim() || !addrCity.trim() || !addrState.trim() || !addrPostal.trim()) {
      setAddrError("All required address fields must be filled.");
      return;
    }

    setAddrError(null);
    setIsSavingAddr(true);
    try {
      if (editingAddressId) {
        await updateCustomerAddressAction(editingAddressId, {
          name: addrName.trim(),
          phone: addrPhone.trim(),
          addressLine1: addrLine1.trim(),
          addressLine2: addrLine2.trim() || null,
          city: addrCity.trim(),
          state: addrState.trim(),
          postalCode: addrPostal.trim(),
          country: addrCountry.trim(),
          isDefault: addrIsDefault,
          type: addrType,
        });
      } else {
        await createCustomerAddressAction({
          customerId: customer.id,
          name: addrName.trim(),
          phone: addrPhone.trim(),
          addressLine1: addrLine1.trim(),
          addressLine2: addrLine2.trim() || null,
          city: addrCity.trim(),
          state: addrState.trim(),
          postalCode: addrPostal.trim(),
          country: addrCountry.trim(),
          isDefault: addrIsDefault,
          type: addrType,
        });
      }

      setAddressModalOpen(false);
      router.refresh();
    } catch (err: unknown) {
      setAddrError(err instanceof Error ? err.message : "Failed to save address");
    } finally {
      setIsSavingAddr(false);
    }
  }

  async function handleSetDefaultAddress(addrId: string) {
    try {
      await setDefaultAddressAction(addrId, customer.id);
      router.refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to set default address");
    }
  }

  async function handleDeleteAddress(addrId: string) {
    if (!confirm("Are you sure you want to delete this address?")) return;
    try {
      await deleteCustomerAddressAction(addrId, customer.id);
      router.refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete address");
    }
  }

  async function handleArchive() {
    if (!confirm("Archive this customer?")) return;
    try {
      await archiveCustomerAction(customer.id);
      router.refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to archive customer");
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-2 text-slate-400 hover:text-white text-xs"
          asChild
        >
          <Link href="/dashboard/customers">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Customers
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs border-slate-700 text-slate-300 hover:text-white"
            onClick={() => {
              setProfileError(null);
              setEditProfileOpen(true);
            }}
          >
            <Edit2 className="h-3 w-3 mr-1" />
            Edit Profile
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs text-rose-400 hover:bg-rose-950/30"
            onClick={handleArchive}
          >
            Archive
          </Button>
        </div>
      </div>

      {/* Customer Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/50 p-5 rounded-xl border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xl flex-shrink-0">
            {customer.firstName ? customer.firstName.charAt(0).toUpperCase() : "C"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">{customer.fullName}</h1>
              {customer.segment === "HIGH_VALUE" && (
                <Badge variant="outline" className="border-amber-500/40 bg-amber-950/40 text-amber-300 text-[10px] font-semibold">
                  <Award className="h-3 w-3 mr-1" /> High Value
                </Badge>
              )}
              {customer.segment === "RETURNING" && (
                <Badge variant="outline" className="border-indigo-500/40 bg-indigo-950/40 text-indigo-300 text-[10px]">
                  <Sparkles className="h-3 w-3 mr-1" /> Returning
                </Badge>
              )}
              {customer.segment === "NEW" && (
                <Badge variant="outline" className="border-cyan-500/40 bg-cyan-950/40 text-cyan-300 text-[10px]">
                  <UserPlus className="h-3 w-3 mr-1" /> New
                </Badge>
              )}
              {customer.segment === "INACTIVE" && (
                <Badge variant="outline" className="border-slate-700 bg-slate-800 text-slate-400 text-[10px]">
                  <Clock className="h-3 w-3 mr-1" /> Inactive
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-1">
              {customer.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5 text-slate-500" />
                  {customer.email}
                </span>
              )}
              {customer.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-slate-500" />
                  {customer.phone}
                </span>
              )}
              <span className="flex items-center gap-1 text-slate-500">
                <Calendar className="h-3.5 w-3.5" />
                Member since {new Date(customer.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        <Badge
          variant="outline"
          className={
            customer.status === "ACTIVE"
              ? "border-emerald-500/30 bg-emerald-950/40 text-emerald-300 text-xs py-1 px-3"
              : "border-slate-700 bg-slate-800 text-slate-400 text-xs py-1 px-3"
          }
        >
          {customer.status}
        </Badge>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Orders</span>
          <p className="text-2xl font-bold text-white mt-1">{metrics.ordersCount}</p>
          <span className="text-[10px] text-slate-500">Completed purchases</span>
        </div>
        <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-4">
          <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Lifetime Spend</span>
          <p className="text-2xl font-bold text-emerald-300 mt-1">{metrics.totalSpentFormatted}</p>
          <span className="text-[10px] text-emerald-500/80">Stored in integer Paise</span>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Average Order Value</span>
          <p className="text-2xl font-bold text-indigo-300 mt-1">{metrics.averageOrderValueFormatted}</p>
          <span className="text-[10px] text-slate-500">Spend per order</span>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Last Order</span>
          <p className="text-base font-bold text-white mt-1">
            {metrics.lastOrderAt ? new Date(metrics.lastOrderAt).toLocaleDateString() : "No orders yet"}
          </p>
          <span className="text-[10px] text-slate-500">Recency indicator</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Customer Profile & Merchant Notes */}
        <div className="space-y-6">
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader className="pb-3 border-b border-slate-800">
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-400" />
                Merchant Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 text-xs">
              {customer.notes ? (
                <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">{customer.notes}</p>
              ) : (
                <p className="text-slate-500 italic">No notes recorded for this customer.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Address Book & Orders History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Address Book Card */}
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader className="pb-3 border-b border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-indigo-400" />
                    Address Book
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400 mt-0.5">
                    Shipping and billing addresses saved for this customer.
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={handleOpenCreateAddress}
                  className="h-7 text-xs bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Address
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {addresses.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs">
                  <MapPin className="h-6 w-6 mx-auto mb-2 opacity-30" />
                  No saved addresses found. Click &quot;Add Address&quot; to save one.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 text-xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-semibold text-white">{addr.name}</span>
                          {addr.isDefault ? (
                            <Badge variant="outline" className="border-emerald-500/40 bg-emerald-950/40 text-emerald-300 text-[10px] flex items-center gap-1">
                              <Star className="h-2.5 w-2.5 fill-emerald-300" /> Default
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-slate-800 text-slate-400 text-[10px]">
                              {addr.type || "SHIPPING"}
                            </Badge>
                          )}
                        </div>

                        <div className="text-slate-300 space-y-0.5">
                          <p>{addr.addressLine1}</p>
                          {addr.addressLine2 && <p>{addr.addressLine2}</p>}
                          <p>
                            {addr.city}, {addr.state} {addr.postalCode}
                          </p>
                          <p className="text-slate-400">{addr.country}</p>
                          <p className="text-slate-400 mt-1">Phone: {addr.phone}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-800/80 pt-2 mt-3">
                        {!addr.isDefault ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-[11px] text-indigo-400 hover:text-indigo-300 p-0"
                            onClick={() => handleSetDefaultAddress(addr.id)}
                          >
                            Set Default
                          </Button>
                        ) : (
                          <div />
                        )}

                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-slate-400 hover:text-white"
                            onClick={() => handleOpenEditAddress(addr)}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-rose-400 hover:text-rose-300"
                            onClick={() => handleDeleteAddress(addr.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order History Card (Phase 9 Integration Clean Boundary) */}
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader className="pb-3 border-b border-slate-800">
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-indigo-400" />
                Customer Order History
              </CardTitle>
              <CardDescription className="text-xs text-slate-400 mt-0.5">
                Full order lifecycle and transaction breakdown.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 text-center text-xs">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-400 mb-2">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <p className="font-semibold text-white">Orders Integration Architecture Ready</p>
              <p className="text-slate-400 max-w-sm mx-auto mt-1 text-[11px]">
                Customer profile is store-scoped and ready for Phase 9 Order Management and Checkout integration.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* EDIT PROFILE MODAL */}
      <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
        <DialogContent className="border-slate-800 bg-slate-900 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Edit2 className="h-4 w-4 text-indigo-400" />
              Edit Customer Profile
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Update store-scoped profile and merchant notes.
            </DialogDescription>
          </DialogHeader>

          {profileError && (
            <div className="rounded-lg bg-rose-950/50 border border-rose-800 p-2.5 text-xs text-rose-300">
              {profileError}
            </div>
          )}

          <form onSubmit={handleProfileSubmit} className="space-y-3.5 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-medium text-slate-300">First Name *</label>
                <Input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="h-8 bg-slate-950 border-slate-800 text-white text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium text-slate-300">Last Name</label>
                <Input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="h-8 bg-slate-950 border-slate-800 text-white text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-medium text-slate-300">Email Address</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-8 bg-slate-950 border-slate-800 text-white text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-slate-300">Phone Number</label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-8 bg-slate-950 border-slate-800 text-white text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-slate-300">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as CustomerStatus)}
                className="w-full rounded-md border border-slate-800 bg-slate-950 p-2 text-xs text-white"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-medium text-slate-300">Internal Merchant Notes</label>
              <Input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-8 bg-slate-950 border-slate-800 text-white text-xs"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-white"
                onClick={() => setEditProfileOpen(false)}
                disabled={isSavingProfile}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
                disabled={isSavingProfile}
              >
                {isSavingProfile ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CREATE / EDIT ADDRESS MODAL */}
      <Dialog open={addressModalOpen} onOpenChange={setAddressModalOpen}>
        <DialogContent className="border-slate-800 bg-slate-900 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <MapPin className="h-4 w-4 text-indigo-400" />
              {editingAddressId ? "Edit Address" : "Add Address"}
            </DialogTitle>
          </DialogHeader>

          {addrError && (
            <div className="rounded-lg bg-rose-950/50 border border-rose-800 p-2.5 text-xs text-rose-300">
              {addrError}
            </div>
          )}

          <form onSubmit={handleAddressSubmit} className="space-y-3.5 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-medium text-slate-300">Recipient Name *</label>
                <Input
                  type="text"
                  required
                  value={addrName}
                  onChange={(e) => setAddrName(e.target.value)}
                  className="h-8 bg-slate-950 border-slate-800 text-white text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium text-slate-300">Phone Number *</label>
                <Input
                  type="tel"
                  required
                  value={addrPhone}
                  onChange={(e) => setAddrPhone(e.target.value)}
                  className="h-8 bg-slate-950 border-slate-800 text-white text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-medium text-slate-300">Address Line 1 *</label>
              <Input
                type="text"
                required
                value={addrLine1}
                onChange={(e) => setAddrLine1(e.target.value)}
                placeholder="House / Flat No., Street name"
                className="h-8 bg-slate-950 border-slate-800 text-white text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-slate-300">Address Line 2</label>
              <Input
                type="text"
                value={addrLine2}
                onChange={(e) => setAddrLine2(e.target.value)}
                placeholder="Apartment, suite, landmark"
                className="h-8 bg-slate-950 border-slate-800 text-white text-xs"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="font-medium text-slate-300">City *</label>
                <Input
                  type="text"
                  required
                  value={addrCity}
                  onChange={(e) => setAddrCity(e.target.value)}
                  className="h-8 bg-slate-950 border-slate-800 text-white text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium text-slate-300">State *</label>
                <Input
                  type="text"
                  required
                  value={addrState}
                  onChange={(e) => setAddrState(e.target.value)}
                  className="h-8 bg-slate-950 border-slate-800 text-white text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium text-slate-300">PIN Code *</label>
                <Input
                  type="text"
                  required
                  value={addrPostal}
                  onChange={(e) => setAddrPostal(e.target.value)}
                  className="h-8 bg-slate-950 border-slate-800 text-white text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-medium text-slate-300">Country</label>
                <Input
                  type="text"
                  value={addrCountry}
                  onChange={(e) => setAddrCountry(e.target.value)}
                  className="h-8 bg-slate-950 border-slate-800 text-white text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium text-slate-300">Address Type</label>
                <select
                  value={addrType}
                  onChange={(e) => setAddrType(e.target.value as AddressType)}
                  className="w-full rounded-md border border-slate-800 bg-slate-950 p-2 text-xs text-white"
                >
                  <option value="SHIPPING">SHIPPING</option>
                  <option value="BILLING">BILLING</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="defaultAddr"
                checked={addrIsDefault}
                onChange={(e) => setAddrIsDefault(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-indigo-500"
              />
              <label htmlFor="defaultAddr" className="text-slate-300 cursor-pointer">
                Set as default customer address
              </label>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-white"
                onClick={() => setAddressModalOpen(false)}
                disabled={isSavingAddr}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
                disabled={isSavingAddr}
              >
                {isSavingAddr ? "Saving..." : "Save Address"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
