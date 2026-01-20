// src/shims-global.d.ts

// Navigator augmentation
interface Navigator {
  clipboard: {
    writeText(text: string): Promise<void>;
    readText(): Promise<string>;
  };
}

// Window augmentation (if needed for other globals)
interface Window {
  // Add any other global properties here if needed
}
