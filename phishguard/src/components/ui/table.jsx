import * as React from "react";
import { cn } from "@/lib/utils";

const Table = ({ className, ...props }) => (
  <div className="w-full overflow-x-auto">
    <table className={cn("w-full caption-bottom text-sm", className)} {...props} />
  </div>
);
const TableHeader = ({ className, ...props }) => <thead className={cn("[&_tr]:border-b", className)} {...props} />;
const TableBody = ({ className, ...props }) => <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
const TableRow = ({ className, ...props }) => (
  <tr className={cn("border-b border-border transition-colors hover:bg-secondary/60", className)} {...props} />
);
const TableHead = ({ className, ...props }) => (
  <th scope="col" className={cn("h-10 whitespace-nowrap px-4 text-left align-middle text-xs font-semibold text-muted-foreground", className)} {...props} />
);
const TableCell = ({ className, ...props }) => <td className={cn("px-4 py-3 align-middle", className)} {...props} />;

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
