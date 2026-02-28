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
    input_file = "public/NewLogo.jpg"
    output_file = "public/logo.png"
    
    try:
        remove_background(input_file, output_file, tolerance=30)
    except Exception as e:
        print(f"Error: {e}")
