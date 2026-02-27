#!/usr/bin/env python3
"""
Remove background from civIQLogo.png and save as transparent PNG
"""
from PIL import Image
import numpy as np

def remove_background(input_path, output_path, tolerance=30):
    """
    Remove white/light background from image and make it transparent.
    """
    img = Image.open(input_path).convert('RGBA')
    data = np.array(img)
    
    # Get the alpha channel
    r, g, b, a = data.T
    
    # Define white/light background threshold
    white_areas = (r > 255 - tolerance) & (g > 255 - tolerance) & (b > 255 - tolerance)
    
    # Make white areas transparent
    data[..., 3][white_areas.T] = 0
    
    # Create new image with transparent background
    result = Image.fromarray(data)
    
    # Save as PNG with transparency
    result.save(output_path, 'PNG')
    print(f"✓ Saved transparent logo to: {output_path}")
    return result

if __name__ == "__main__":
    input_file = "public/civIQLogo.png"
    output_file = "public/civiq-logo-transparent.png"
    
    try:
        remove_background(input_file, output_file, tolerance=25)
    except Exception as e:
        print(f"Error: {e}")
        # Fallback: just copy if already has transparency
        img = Image.open(input_file)
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        img.save(output_file, 'PNG')
        print(f"✓ Saved logo (fallback) to: {output_file}")
