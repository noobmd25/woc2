import * as React from "react"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Select as RadixSelect,
  SelectGroup,
  SelectItem as RadixSelectItem,
  SelectContent,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  SelectIcon,
  SelectSeparator,
  SelectViewport,
  SelectItemText,
  SelectItemIndicator,
} from "@radix-ui/react-select"

const Select = RadixSelect

const SelectItem = React.forwardRef<
  React.ElementRef<typeof RadixSelectItem>,
  React.ComponentPropsWithoutRef<typeof RadixSelectItem>
>(({ className, children, ...props }, ref) => {
  return (
    <RadixSelectItem
      ref={ref}
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground",
        className
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <SelectItemIndicator>
          <Check className="h-4 w-4" />
        </SelectItemIndicator>
      </span>
      <SelectItemText>{children}</SelectItemText>
    </RadixSelectItem>
  )
})
SelectItem.displayName = RadixSelectItem.displayName

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectViewport,
  SelectIcon,
}