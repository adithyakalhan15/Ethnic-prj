import { useState, useCallback } from "react";
import { createScrapItem } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2, MapPin, Upload } from "lucide-react";
import { toast } from "sonner";

interface CreateListingDialogProps {
  onSuccess?: () => void;
}

export function CreateListingDialog({ onSuccess }: CreateListingDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [latitude, setLatitude] = useState<string>("");
  const [longitude, setLongitude] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
  };

  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    toast.info("Getting current location...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        toast.success("Location acquired!");
      },
      (error) => {
        console.error("Geo Error:", {
          code: error.code,
          message: error.message,
        });

        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error("Location access denied. Please enable GPS.");
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error("Location information is unavailable.");
            break;
          case error.TIMEOUT:
            toast.error("Location request timed out.");
            break;
          default:
            toast.error("An unknown location error occurred.");
            break;
        }
      }
    );
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!latitude || !longitude) {
      toast.error("Location coordinates are required.");
      return;
    }

    setLoading(true);

    try {
      let imageUrl = "";

      // Upload image if provided
      if (imageFile) {
        const uploadFormData = new FormData();
        uploadFormData.append('file', imageFile);

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: uploadFormData,
        });

        const uploadData = await uploadRes.json();

        if (!uploadRes.ok) {
          toast.error(uploadData.error || 'Failed to upload image');
          setLoading(false);
          return;
        }

        imageUrl = uploadData.imageUrl;
      }

      const formData = new FormData(e.currentTarget);
      formData.set("imageUrl", imageUrl);
      formData.append("latitude", latitude);
      formData.append("longitude", longitude);

      const result = await createScrapItem(formData);

      if (result.success) {
        toast.success("Scrap listed successfully!");
        if (onSuccess) onSuccess();
        setOpen(false);
        setLatitude("");
        setLongitude("");
        setImageFile(null);
        setImagePreview(null);
      } else {
        toast.error(result.error || "Failed to create listing");
      }
    } catch (error) {
      toast.error("An error occurred while creating the listing.");
    }
    setLoading(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const inputClasses = "bg-slate-50 border-slate-200 focus-visible:ring-primary h-11";
  const labelClasses = "text-sm font-semibold text-slate-700 mb-1.5 inline-block";

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 rounded-xl h-11 px-6 shadow-md shadow-primary/20">
          <Plus className="h-5 w-5" /> Sell Scrap
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px] rounded-3xl p-6 overflow-y-auto max-h-[90vh]">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-2xl font-bold tracking-tight">Create New Listing</DialogTitle>
          <DialogDescription className="text-slate-500 text-sm">
            List your scrap materials for pickup by collectors in your area.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-4">
          {/* Title Output */}
          <div className="space-y-0.5">
            <Label htmlFor="title" className={labelClasses}>Title</Label>
            <Input
              id="title"
              name="title"
              placeholder="e.g., Old electronics for recycling"
              required
              className={`${inputClasses} border-primary/40 focus-visible:border-primary ring-offset-0`}
            />
          </div>

          {/* Description */}
          <div className="space-y-0.5">
            <Label htmlFor="description" className={labelClasses}>Description (Optional)</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Describe your scrap materials..."
              className="bg-slate-50 border-slate-200 focus-visible:ring-primary min-h-[100px] resize-none"
            />
          </div>

          {/* Type & Weight Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="wasteType" className={labelClasses}>Waste Type</Label>
              <Select name="wasteType" required defaultValue="MIXED">
                <SelectTrigger className={inputClasses}>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="MIXED">Mixed</SelectItem>
                  <SelectItem value="METAL">Metal</SelectItem>
                  <SelectItem value="PLASTIC">Plastic</SelectItem>
                  <SelectItem value="PAPER">Paper</SelectItem>
                  <SelectItem value="E_WASTE">E-Waste</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="estimatedWeight" className={labelClasses}>Weight (kg)</Label>
              <Input
                id="estimatedWeight"
                name="estimatedWeight"
                type="number"
                step="0.1"
                placeholder="1.0"
                required
                className={inputClasses}
              />
            </div>
          </div>

          {/* Image Upload */}
          <div className="space-y-0.5">
            <Label htmlFor="image" className={labelClasses}>Upload Image (Optional)</Label>
            <div className="relative">
              {imagePreview ? (
                <div className="relative w-full h-40 rounded-lg overflow-hidden border border-slate-200">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setImageFile(null); setImagePreview(null); }}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="image"
                  className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-primary hover:bg-slate-50 transition-colors"
                >
                  <Upload className="h-8 w-8 text-slate-400 mb-2" />
                  <span className="text-sm text-slate-500">Click to upload image</span>
                  <span className="text-xs text-slate-400 mt-1">JPEG, PNG, WebP (max 5MB)</span>
                </label>
              )}
              <input
                id="image"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-0.5">
            <Label htmlFor="address" className={labelClasses}>Pickup Address</Label>
            <Input
              id="address"
              name="address"
              placeholder="Enter your address"
              required
              className={inputClasses}
            />
          </div>

          {/* Coordinates Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="latitude" className={labelClasses}>Latitude</Label>
              <Input
                id="latitude"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="6.9271"
                required
                className={inputClasses}
              />
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="longitude" className={labelClasses}>Longitude</Label>
              <Input
                id="longitude"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="79.8612"
                required
                className={inputClasses}
              />
            </div>
          </div>

          {/* Use Location Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2 rounded-xl h-11 border-slate-200 text-slate-600 hover:bg-slate-50"
            onClick={detectLocation}
          >
            <MapPin className="h-4 w-4" /> Use Current Location
          </Button>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full h-12 rounded-xl text-base font-semibold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all mt-4"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="animate-spin h-5 w-5" />
            ) : (
              "Create Listing"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
