"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Search,
  Building2,
  MapPin,
  Briefcase,
  Phone,
  Mail,
  Globe,
  Edit,
  Eye,
  TrendingUp,
  DollarSign,
  Loader2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { set } from "date-fns";
import SelectComponent from 'react-select';
import countryList from 'react-select-country-list';
import PhoneInput, { parsePhoneNumber, getCountries, getCountryCallingCode } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

// React Select styles
const selectStyles = {
  control: (base: any, state: any) => ({
    ...base,
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    padding: '2px 4px',
    fontSize: '14px',
    '&:hover': {
      borderColor: '#9ca3af',
    }
  }),
  option: (base: any, state: any) => ({
    ...base,
    fontSize: '14px',
    backgroundColor: state.isSelected ? '#2563eb' : state.isFocused ? '#f3f4f6' : 'white',
    '&:hover': {
      backgroundColor: state.isSelected ? '#2563eb' : '#f3f4f6',
    }
  }),
  singleValue: (base: any) => ({
    ...base,
    fontSize: '14px',
  }),
  placeholder: (base: any) => ({
    ...base,
    fontSize: '14px',
    color: '#9ca3af',
  }),
};

// Types
interface Contact {
  id?: number;
  name: string;
  role: string;
  email: string;
  phone: string;
}

interface Company {
  id: number;
  name: string;
  region: string;
  type: "PRIVATE" | "GOVERNMENT" | "MIXED" | "NON_PROFIT" | "JOINT_STOCK" | "TRADER" | "CONTRACTOR" | "CONSULTANT";
  address: string;
  website: string;
  totalOpportunities: number;
  opportunities: { id: number; name: string; quantity: number; stage: string; status: string }[];
  openDeals: number;
  totalQuantity: number;
  contacts: Contact[];
}
interface NewCompany {
  name: string;
  region: string;
  type: "PRIVATE" | "GOVERNMENT" | "MIXED" | "NON_PROFIT" | "JOINT_STOCK" | "TRADER" | "CONTRACTOR" | "CONSULTANT";
  address: string;
  website: string;
  contacts: Contact[];
}

const typeColors: Record<Company["type"], string> = {
  PRIVATE: "bg-blue-100 text-blue-800",
  GOVERNMENT: "bg-green-100 text-green-800",
  MIXED: "bg-purple-100 text-purple-800",
  NON_PROFIT: "bg-teal-100 text-teal-800",
  JOINT_STOCK: "bg-yellow-100 text-yellow-800",
  TRADER: "bg-red-100 text-red-800",
  CONTRACTOR: "bg-indigo-100 text-indigo-800",
  CONSULTANT: "bg-pink-100 text-pink-800",
};

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [regionFilter, setRegionFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [isEditContactDialogOpen, setIsEditContactDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<{contact: Contact, index: number} | null>(null);
  const [isAddContactDialogOpen, setIsAddContactDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newCompany, setNewCompany] = useState<NewCompany>({
    name: "",
    region: "",
    type: "PRIVATE",
    address: "",
    website: "",
    contacts: [{ id: 0, name: "", role: "", email: "", phone: "" }],
  });

  const [contactCountry, setContactCountry] = useState("US");
  const [contactPhoneNational, setContactPhoneNational] = useState("");

  const [editContactCountry, setEditContactCountry] = useState("US");
  const [editContactPhoneNational, setEditContactPhoneNational] = useState("");

  const [addContactCountry, setAddContactCountry] = useState("US");
  const [addContactPhoneNational, setAddContactPhoneNational] = useState("");

  const [editCompany, setEditCompany] = useState<Partial<Company>>({
    name: "",
    region: "",
    type: "PRIVATE",
    address: "",
    website: "",
  });

  const [editContact, setEditContact] = useState<Contact>({
    id: 0,
    name: "",
    role: "",
    email: "",
    phone: "",
  });

  const [newContact, setNewContact] = useState<Contact>({
    name: "",
    role: "",
    email: "",
    phone: "",
  });

  // region codes removed - using react-phone-number-input for better phone handling

  // Countries data from react-select-country-list
  const countriesOptions = countryList().getData();

  // Keep as simple array of strings for shadcn selects (for now)
  const countries = countriesOptions.map(country => country.label);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/companies");
      const data = await response.json();
      console.log("Fetched companies:", data);

      if (response.ok) {
        setCompanies(data.companies || []);
      } else {
        setError(data.error || "Failed to fetch companies");
        // Fallback to mock data if API fails
        // setCompanies(mockCompanies);
      }
    } catch (err) {
      setError("Failed to load companies data");
      // Fallback to mock data
      // setCompanies(mockCompanies);
    } finally {
      setLoading(false);
    }
  };

  // Filter companies based on search and filters
  const filteredCompanies = companies.filter((company) => {
    const matchesSearch = company.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesRegion =
      regionFilter === "all" || company.region === regionFilter;
    const matchesType = typeFilter === "all" || company.type === typeFilter;
    return matchesSearch && matchesRegion && matchesType;
  });

  const handleViewDetails = (company: Company) => {
    setSelectedCompany(company);
    setIsDetailDialogOpen(true);
  };

  const handleEditClick = (company: Company) => {
    setEditingCompany(company);
    setEditCompany({
      name: company.name,
      region: company.region,
      type: company.type,
      address: company.address,
      website: company.website,
    });
    setIsEditDialogOpen(true);
  };

  const handleEditCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!editCompany.name || !editCompany.region || !editCompany.type) {
      toast.info("Please fill in all required fields");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`/api/companies/${editingCompany?.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editCompany),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Company updated successfully");
        setIsEditDialogOpen(false);
        setEditingCompany(null);
        setIsSubmitting(false);
        fetchCompanies(); // Refresh the list
      } else {
        const errorMessage = data.error || "Failed to update company";
        toast.error(errorMessage);
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Error updating company:", error);
      toast.error("Failed to update company");
      setIsSubmitting(false);
    }
  };

  const handleEditContactClick = (contact: Contact, index: number) => {
    setEditingContact({ contact, index });
    setEditContact({
      id: contact.id,
      name: contact.name,
      role: contact.role,
      email: contact.email,
      phone: contact.phone,
    });

    // Parse the phone number to separate country and national parts
    if (contact.phone && contact.phone.trim() !== "") {
      try {
        const parsedPhone = parsePhoneNumber(contact.phone);
        if (parsedPhone && parsedPhone.country && parsedPhone.nationalNumber) {
          setEditContactCountry(parsedPhone.country);
          setEditContactPhoneNational(parsedPhone.nationalNumber);
        } else {
          // Fallback if parsing fails
          setEditContactCountry("US");
          setEditContactPhoneNational(contact.phone);
        }
      } catch (error) {
        console.warn("Phone parsing failed, using defaults:", contact.phone);
        setEditContactCountry("US");
        setEditContactPhoneNational(contact.phone);
      }
    } else {
      setEditContactCountry("US");
      setEditContactPhoneNational("");
    }

    setIsEditContactDialogOpen(true);
  };

  const handleEditContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!editingContact || !selectedCompany) return;

    // Update the contact in the local companies state
    

    try {
      const response = await fetch(`/api/contacts/${editingContact.contact.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editContact }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Contact updated successfully");
        setIsEditContactDialogOpen(false);
        setEditingContact(null);
        setSelectedCompany((prev) =>
          prev
            ? {
                ...prev,
                contacts: prev.contacts.map((c) =>
                  c.id === editingContact.contact.id ? { ...c, ...editContact } : c
                ),
              }
            : null
        );
        fetchCompanies(); // Refresh the companies list
      } else {
        const errorMessage = data.error || "Failed to update contact";
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("Error updating contact:", error);
      toast.error("Failed to update contact");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddContactClick = () => {
    setNewContact({
      name: "",
      role: "",
      email: "",
      phone: "",
    });
    setIsAddContactDialogOpen(true);
  };

  const handleAddContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!selectedCompany || !newContact.name || !newContact.email) {
      toast.info("Please provide at least a contact name and email");
      setIsSubmitting(false);
      return;
    }

    // Add the new contact to the existing contacts
  

    try {
      const response = await fetch(`/api/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newContact, companyId: selectedCompany.id }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Contact added successfully");
        setIsAddContactDialogOpen(false);
        setNewContact({
          name: "",
          role: "",
          email: "",
          phone: "",
        });
        // setSelectedCompany(); // Update local state
        setSelectedCompany((prev) =>
          prev
            ? { ...prev, contacts: [...prev.contacts, newContact] }
            : prev
        );
        fetchCompanies(); // Refresh the companies list
      } else {
        const errorMessage = data.error || "Failed to add contact";
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("Error adding contact:", error);
      toast.error("Failed to add contact");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalStats = {
    companies: companies.length,
    opportunities: companies.reduce((acc, c) => acc + c.totalOpportunities, 0),
    openDeals: companies.reduce((acc, c) => acc + c.openDeals, 0),
    totalQuantity: companies.reduce((acc, c) => acc + c.totalQuantity, 0),
  };

  // Combine phone number
  const combinePhone = (country: string, national: string) => {
    if (!country || !national) return "";
    const callingCode = getCountryCallingCode(country as any);
    return `+${callingCode}${national.replace(/^\+/, "").replace(/\D/g, "")}`;
  };

  // Update phone when country or national changes for new company
  useEffect(() => {
    const fullPhone = combinePhone(contactCountry, contactPhoneNational);
    setNewCompany({
      ...newCompany,
      contacts: [
        {
          ...newCompany.contacts[0],
          phone: fullPhone,
        },
      ],
    });
  }, [contactCountry, contactPhoneNational]);

  // Update phone when country or national changes for edit contact
  useEffect(() => {
    const fullPhone = combinePhone(editContactCountry, editContactPhoneNational);
    setEditContact({
      ...editContact,
      phone: fullPhone,
    });
  }, [editContactCountry, editContactPhoneNational]);

  // Update phone when country or national changes for add contact
  useEffect(() => {
    const fullPhone = combinePhone(addContactCountry, addContactPhoneNational);
    setNewContact({
      ...newContact,
      phone: fullPhone,
    });
  }, [addContactCountry, addContactPhoneNational]);

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    if (!newCompany.name || !newCompany.region || !newCompany.type) {
      toast.info("Please fill in all required fields");
      return;
    }
    console.log("submitting the data");
    if (
      newCompany.contacts[0].name === "" &&
      newCompany.contacts[0].role === "" &&
      newCompany.contacts[0].email === "" &&
      newCompany.contacts[0].phone === ""
    ) {
      toast.info("Please fill the primary contact details");
      return;
    }

    try {
      const response = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCompany),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Company created successfully");
        setIsAddDialogOpen(false);
        setIsSubmitting(false);
        fetchCompanies(); // Refresh the list
      } else {
        // Handle HTTP error responses
        const errorMessage = data.error || "Failed to create company";
        toast.error(errorMessage);
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Error creating company:", error);
      toast.error("Failed to create company");
      setIsSubmitting(false);
    }


  };

  if (loading) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
          <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                Loading companies...
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error && companies.length === 0) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
          <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
              <Button onClick={fetchCompanies}>Try Again</Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                Master
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Manage your client companies and contacts
              </p>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="mr-2 h-4 w-4" /> Add Company
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>Add New Company</DialogTitle>
                  <DialogDescription>
                    Fill in the company details. Fields marked with * are
                    required.
                  </DialogDescription>
                </DialogHeader>

                {/* ✅ scrollable form */}
                <form
                  onSubmit={handleCreateCompany}
                  className="flex-1 overflow-y-auto px-1"
                >
                  <div className="grid gap-6 py-4">
                    {/* Company Name */}
                    <div className="grid gap-2">
                      <Label htmlFor="name">Company Name *</Label>
                      <Input
                        id="name"
                        name="name"
                        placeholder="e.g., Acme Corporation"
                        value={newCompany.name}
                        onChange={(e) =>
                          setNewCompany({ ...newCompany, name: e.target.value })
                        }
                        required
                      />
                    </div>

                    {/* region + Type */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="region">Country *</Label>
                        <SelectComponent
                          options={countriesOptions.map(country => ({ value: country.label, label: country.label }))}
                          value={countriesOptions.find(country => country.label === newCompany.region) ?
                            { value: newCompany.region, label: newCompany.region } : null}
                          onChange={(selected: any) =>
                            setNewCompany({ ...newCompany, region: selected ? selected.value : "" })
                          }
                          styles={selectStyles}
                          placeholder="Select country"
                          isSearchable={true}
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="type">Company Type *</Label>
                        <Select
                          value={newCompany.type.toUpperCase()}
                          onValueChange={(val) =>
                            setNewCompany({
                              ...newCompany,
                              type: val as Company["type"],
                            })
                          }
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PRIVATE">Private</SelectItem>
                            <SelectItem value="GOVERNMENT">
                              Government
                            </SelectItem>
                            <SelectItem value="MIXED">Mixed</SelectItem>
                            <SelectItem value="JOINT_STOCK">Joint-stock</SelectItem>
                            <SelectItem value="TRADER">Trader</SelectItem>
                            <SelectItem value="CONTRACTOR">Contractor</SelectItem>
                            <SelectItem value="CONSULTANT">Consultant</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Address */}
                    <div className="grid gap-2">
                      <Label htmlFor="address">Company Address</Label>
                      <Input
                        id="address"
                        name="address"
                        placeholder="123 Market Street, San Francisco, CA"
                        value={newCompany.address}
                        onChange={(e) =>
                          setNewCompany({
                            ...newCompany,
                            address: e.target.value,
                          })
                        }
                      />
                    </div>

                    {/* Website */}
                    <div className="grid gap-2">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        name="website"
                        type="url"
                        placeholder="https://www.company.com"
                        value={newCompany.website}
                        onChange={(e) =>
                          setNewCompany({
                            ...newCompany,
                            website: e.target.value,
                          })
                        }
                      />
                    </div>

                    {/* Contact fields in a responsive grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="contactName">
                          Primary Contact Name
                        </Label>
                        <Input
                          id="contactName"
                          name="contactName"
                          placeholder="John Doe"
                          value={newCompany.contacts[0]?.name || ""}
                          onChange={(e) =>
                            setNewCompany({
                              ...newCompany,
                              contacts: [
                                {
                                  ...newCompany.contacts[0],
                                  name: e.target.value,
                                },
                              ],
                            })
                          }
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="contactRole">Contact Role</Label>
                        <Input
                          id="contactRole"
                          name="contactRole"
                          placeholder="CEO"
                          value={newCompany.contacts[0]?.role || ""}
                          onChange={(e) =>
                            setNewCompany({
                              ...newCompany,
                              contacts: [
                                {
                                  ...newCompany.contacts[0],
                                  role: e.target.value,
                                },
                              ],
                            })
                          }
                        />
                      </div>
                    </div>

                    {/* Contact Email */}
                    <div className="grid gap-2">
                      <Label htmlFor="contactEmail">Contact Email</Label>
                      <Input
                        id="contactEmail"
                        name="contactEmail"
                        type="email"
                        placeholder="john@company.com"
                        value={newCompany.contacts[0]?.email || ""}
                        onChange={(e) =>
                          setNewCompany({
                            ...newCompany,
                            contacts: [
                              {
                                ...newCompany.contacts[0],
                                email: e.target.value,
                              },
                            ],
                          })
                        }
                      />
                    </div>

                    {/* Contact Phone */}
                    <div className="flex gap-2">
                      <div className="grid gap-2">
                        <Label htmlFor="contactPhoneCountry">Phone Country</Label>
                        <Select
                          value={contactCountry}
                          onValueChange={setContactCountry}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                          <SelectContent>
                            {getCountries().map((country) => (
                              <SelectItem key={country} value={country}>
                                {country} (+{getCountryCallingCode(country)})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="contactPhoneNational">Phone Number</Label>
                        <Input
                          id="contactPhoneNational"
                          name="contactPhoneNational"
                          placeholder="1234567890"
                          value={contactPhoneNational}
                          onChange={(e) => {
                            const numericValue = e.target.value.replace(/\D/g, '');
                            setContactPhoneNational(numericValue);
                          }}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Footer stays pinned at bottom */}
                  <DialogFooter className="sticky bottom-0 bg-white dark:bg-neutral-900 pt-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700"
                      disabled={isSubmitting}
                    >
                      {loading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        "Create Company"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {/* Edit Company Dialog */}
            <Dialog
              open={isEditDialogOpen}
              onOpenChange={(open) => {
                if (!open) {
                  setIsEditDialogOpen(false);
                  setEditingCompany(null);
                }
              }}
            >
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>Edit Company</DialogTitle>
                  <DialogDescription>
                    Update company details. Fields marked with * are required.
                  </DialogDescription>
                </DialogHeader>

                {/* ✅ scrollable form */}
                <form
                  onSubmit={handleEditCompany}
                  className="flex-1 overflow-y-auto px-1"
                >
                  <div className="grid gap-6 py-4">
                    {/* Company Name */}
                    <div className="grid gap-2">
                      <Label htmlFor="edit-name">Company Name *</Label>
                      <Input
                        id="edit-name"
                        name="edit-name"
                        placeholder="e.g., Acme Corporation"
                        value={editCompany.name || ""}
                        onChange={(e) =>
                          setEditCompany({ ...editCompany, name: e.target.value })
                        }
                        required
                      />
                    </div>

                    {/* region + Type */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="edit-region">Country *</Label>
                        <SelectComponent
                          options={countriesOptions.map(country => ({ value: country.label, label: country.label }))}
                          value={countriesOptions.find(country => country.label === editCompany.region) ?
                            { value: editCompany.region, label: editCompany.region } : null}
                          onChange={(selected: any) =>
                            setEditCompany({ ...editCompany, region: selected ? selected.value : "" })
                          }
                          styles={selectStyles}
                          placeholder="Select country"
                          isSearchable={true}
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="edit-type">Company Type *</Label>
                        <Select
                          value={(editCompany.type || "").toUpperCase()}
                          onValueChange={(val) =>
                            setEditCompany({
                              ...editCompany,
                              type: val as Company["type"],
                            })
                          }
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PRIVATE">Private</SelectItem>
                            <SelectItem value="GOVERNMENT">
                              Government
                            </SelectItem>
                            <SelectItem value="MIXED">Mixed</SelectItem>
                            <SelectItem value="JOINT_STOCK">Joint-stock</SelectItem>
                            <SelectItem value="TRADER">Trader</SelectItem>
                            <SelectItem value="CONTRACTOR">Contractor</SelectItem>
                            <SelectItem value="CONSULTANT">Consultant</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Address */}
                    <div className="grid gap-2">
                      <Label htmlFor="edit-address">Company Address</Label>
                      <Input
                        id="edit-address"
                        name="edit-address"
                        placeholder="123 Market Street, San Francisco, CA"
                        value={editCompany.address || ""}
                        onChange={(e) =>
                          setEditCompany({
                            ...editCompany,
                            address: e.target.value,
                          })
                        }
                      />
                    </div>

                    {/* Website */}
                    <div className="grid gap-2">
                      <Label htmlFor="edit-website">Website</Label>
                      <Input
                        id="edit-website"
                        name="edit-website"
                        type="url"
                        placeholder="https://www.company.com"
                        value={editCompany.website || ""}
                        onChange={(e) =>
                          setEditCompany({
                            ...editCompany,
                            website: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  {/* Footer stays pinned at bottom */}
                  <DialogFooter className="sticky bottom-0 bg-white dark:bg-neutral-900 pt-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        "Update Company"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {/* Edit Contact Dialog */}
            <Dialog
              open={isEditContactDialogOpen}
              onOpenChange={(open) => {
                if (!open) {
                  setIsEditContactDialogOpen(false);
                  setEditingContact(null);
                }
              }}
            >
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Edit Contact</DialogTitle>
                  <DialogDescription>
                    Update contact information for {selectedCompany?.name}
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleEditContactSubmit} className="space-y-4">
                  <div className="grid gap-4">
                    {/* Contact Name */}
                    <div className="grid gap-2">
                      <Label htmlFor="edit-contact-name">Full Name *</Label>
                      <Input
                        id="edit-contact-name"
                        value={editContact.name || ""}
                        onChange={(e) =>
                          setEditContact({ ...editContact, name: e.target.value })
                        }
                        placeholder="John Doe"
                        required
                      />
                    </div>

                    {/* Contact Role */}
                    <div className="grid gap-2">
                      <Label htmlFor="edit-contact-role">Position/Role</Label>
                      <Input
                        id="edit-contact-role"
                        value={editContact.role || ""}
                        onChange={(e) =>
                          setEditContact({ ...editContact, role: e.target.value })
                        }
                        placeholder="CEO, Manager, etc."
                      />
                    </div>

                    {/* Contact Email */}
                    <div className="grid gap-2">
                      <Label htmlFor="edit-contact-email">Email Address</Label>
                      <Input
                        id="edit-contact-email"
                        type="email"
                        value={editContact.email || ""}
                        onChange={(e) =>
                          setEditContact({ ...editContact, email: e.target.value })
                        }
                        placeholder="john@company.com"
                      />
                    </div>

                    {/* Contact Phone */}
                    <div className="flex gap-1">
                      <div className="grid gap-2">
                        <Label htmlFor="editContactPhoneCountry">Phone Country</Label>
                        <Select
                          value={editContactCountry}
                          onValueChange={setEditContactCountry}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                          <SelectContent>
                            {getCountries().map((country) => (
                              <SelectItem key={country} value={country}>
                                {country} (+{getCountryCallingCode(country)})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="editContactPhoneNational">Phone Number</Label>
                        <Input
                          id="editContactPhoneNational"
                          name="editContactPhoneNational"
                          placeholder="1234567890"
                          value={editContactPhoneNational}
                          onChange={(e) => {
                            const numericValue = e.target.value.replace(/\D/g, '');
                            setEditContactPhoneNational(numericValue);
                          }}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                        />
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditContactDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        "Update Contact"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {/* Add Contact Dialog */}
            <Dialog
              open={isAddContactDialogOpen}
              onOpenChange={(open) => {
                if (!open) {
                  setIsAddContactDialogOpen(false);
                  setNewContact({
                    name: "",
                    role: "",
                    email: "",
                    phone: "",
                  });
                }
              }}
            >
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add New Contact</DialogTitle>
                  <DialogDescription>
                    Add a new contact for {selectedCompany?.name}
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleAddContactSubmit} className="space-y-4">
                  <div className="grid gap-4">
                    {/* Contact Name */}
                    <div className="grid gap-2">
                      <Label htmlFor="add-contact-name">Full Name *</Label>
                      <Input
                        id="add-contact-name"
                        value={newContact.name}
                        onChange={(e) =>
                          setNewContact({ ...newContact, name: e.target.value })
                        }
                        placeholder="John Doe"
                        required
                      />
                    </div>

                    {/* Contact Role */}
                    <div className="grid gap-2">
                      <Label htmlFor="add-contact-role">Position/Role</Label>
                      <Input
                        id="add-contact-role"
                        value={newContact.role}
                        onChange={(e) =>
                          setNewContact({ ...newContact, role: e.target.value })
                        }
                        placeholder="CEO, Manager, etc."
                      />
                    </div>

                    {/* Contact Email */}
                    <div className="grid gap-2">
                      <Label htmlFor="add-contact-email">Email Address</Label>
                      <Input
                        id="add-contact-email"
                        type="email"
                        value={newContact.email}
                        onChange={(e) =>
                          setNewContact({ ...newContact, email: e.target.value })
                        }
                        placeholder="john@company.com"
                      />
                    </div>

                    {/* Contact Phone */}
                    <div className="flex gap-2">
                      <div className="grid gap-2">
                        <Label htmlFor="addContactPhoneCountry">Phone Country</Label>
                        <Select
                          value={addContactCountry}
                          onValueChange={setAddContactCountry}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                          <SelectContent>
                            {getCountries().map((country) => (
                              <SelectItem key={country} value={country}>
                                {country} (+{getCountryCallingCode(country)})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="addContactPhoneNational">Phone Number</Label>
                        <Input
                          id="addContactPhoneNational"
                          name="addContactPhoneNational"
                          placeholder="1234567890"
                          value={addContactPhoneNational}
                          onChange={(e) => {
                            const numericValue = e.target.value.replace(/\D/g, '');
                            setAddContactPhoneNational(numericValue);
                          }}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                        />
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddContactDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        "Add Contact"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Total Companies
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalStats.companies}</div>
              </CardContent>
            </Card>
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Total Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {totalStats.opportunities}
                </div>
              </CardContent>
            </Card>
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Open Deals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {totalStats.openDeals}
                </div>
              </CardContent>
            </Card>
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Total Value
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  ${totalStats.totalQuantity.toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Search */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search companies by name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="w-[180px]">
                  <SelectComponent
                    options={[{ value: "all", label: "All Countries" }].concat(
                      countriesOptions.slice(0, 10).map(country => ({ value: country.label, label: country.label }))
                    )}
                    value={regionFilter === "all" ? { value: "all", label: "All Countries" } :
                      countriesOptions.find(country => country.label === regionFilter) ?
                      { value: regionFilter, label: regionFilter } : { value: "all", label: "All Countries" }}
                    onChange={(selected: any) =>
                      setRegionFilter(selected ? selected.value : "all")
                    }
                    styles={{
                      ...selectStyles,
                      container: (base: any) => ({
                        ...base,
                        width: '180px',
                      })
                    }}
                    placeholder="Filter by region"
                    isSearchable={true}
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Private">Private</SelectItem>
                    <SelectItem value="Government">Government</SelectItem>
                    <SelectItem value="Mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Companies Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCompanies.map((company) => (
              <Card
                key={company.id}
                className="hover:shadow-xl transition-all duration-300"
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-blue-500" />
                        {company.name}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={typeColors[company.type]}>
                          {company.type}
                        </Badge>
                        <Badge variant="outline">
                          <MapPin className="h-3 w-3 mr-1" />
                          {company.region}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Globe className="h-4 w-4" />
                      <a
                        href={`https://${company.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-blue-600 hover:underline"
                      >
                        {company.website}
                      </a>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <MapPin className="h-4 w-4" />
                      <span className="truncate">{company.address}</span>
                    </div>
                    <div className="pt-3 border-t">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-2xl font-bold text-blue-600">
                            {company.totalOpportunities}
                          </p>
                          <p className="text-xs text-gray-500">Opportunities</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-green-600">
                            {company.openDeals}
                          </p>
                          <p className="text-xs text-gray-500">Open Deals</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-purple-600">
                            {company.contacts.length}
                          </p>
                          <p className="text-xs text-gray-500">Contacts</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleViewDetails(company)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditClick(company)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Company Detail Dialog */}
          <Dialog
            open={isDetailDialogOpen}
            onOpenChange={setIsDetailDialogOpen}
          >
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl flex items-center gap-2">
                  <Building2 className="h-6 w-6 text-blue-500" />
                  {selectedCompany?.name}
                </DialogTitle>
                <DialogDescription>
                  Complete company information and related data
                </DialogDescription>
              </DialogHeader>
              {selectedCompany && (
                <Tabs defaultValue="overview" className="mt-4">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="contacts">
                      Contacts ({selectedCompany.contacts.length})
                    </TabsTrigger>
                    <TabsTrigger value="opportunities">
                      Opportunities ({selectedCompany.totalOpportunities})
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">
                          Company Type
                        </Label>
                        <p className="font-medium">{selectedCompany.type}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">
                          Country
                        </Label>
                        <p className="font-medium">{selectedCompany.region}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">
                          Website
                        </Label>
                        <p className="font-medium">
                          <a
                            href={`https://${selectedCompany.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {selectedCompany.website}
                          </a>
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">
                          Total Deal Quantity
                        </Label>
                        <p className="font-medium text-green-600">
                          {selectedCompany.totalQuantity.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">
                        Address
                      </Label>
                      <p className="font-medium">{selectedCompany.address}</p>
                    </div>
                  </TabsContent>
                  <TabsContent value="contacts" className="space-y-3">
                    <Button
                      size="sm"
                      className="mb-3"
                      onClick={handleAddContactClick}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Contact
                    </Button>
                    {selectedCompany.contacts.map((contact, index) => (
                      <Card key={index}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{contact.name}</p>
                                <div className="flex gap-1">
                                  <Badge className="bg-green-100 text-green-800 text-xs">
                                    Active
                                  </Badge>
                                  {index === 0 ? (
                                    <Badge className="bg-blue-100 text-blue-800 text-xs">
                                      Primary
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-xs">
                                      Non-primary
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {contact.role}
                              </p>
                              <div className="flex items-center gap-3 text-sm">
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {contact.email}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {contact.phone}
                                </span>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditContactClick(contact, index)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </TabsContent>
                  <TabsContent value="opportunities" className="space-y-3">
                    <Button size="sm" className="mb-3" asChild>
                      <Link href="/opportunities">
                        <Plus className="h-4 w-4 mr-1" />
                        Add Opportunity
                      </Link>
                    </Button>
                    <div className="space-y-2">{selectedCompany.opportunities.map((opp, index) => (
                      <Card key={index}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium">
                                {opp.name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                STAGE : {opp.stage}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-green-600">
                                {opp.quantity.toLocaleString()}
                              </p>
                              <Badge className="bg-yellow-100 text-yellow-800">
                                {opp.status??"In Progress"}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    </div>
                    
                  </TabsContent>
                </Tabs>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </>
  );
}
