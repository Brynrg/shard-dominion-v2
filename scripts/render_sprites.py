#!/usr/bin/env python3
"""
Blender script for rendering sprites from 3D models
- Orthographic camera at 45-degree isometric angle
- 3-point lighting setup
- 8 directional rotations (45-degree increments)
- Transparent PNG output
"""

import bpy
import os
import math

def setup_scene():
    """Clear existing scene and setup basic configuration"""
    # Clear scene
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()
    
    # Set up orthographic camera
    camera_data = bpy.data.cameras.new("Camera")
    camera_data.type = 'ORTHO'
    camera_data.ortho_scale = 2.0
    camera_obj = bpy.data.objects.new("Camera", camera_data)
    bpy.context.collection.objects.link(camera_obj)
    
    # Position camera for isometric view
    camera_obj.location = (0, -5, 5)
    camera_obj.rotation_euler = (math.radians(45), 0, math.radians(45))
    
    # Create empty as camera target
    empty = bpy.data.objects.new("Empty", None)
    bpy.context.collection.objects.link(empty)
    empty.location = (0, 0, 0)
    camera_obj.rotation_euler = (math.radians(45), 0, 0)
    
    return camera_obj

def setup_lighting():
    """Setup 3-point lighting"""
    # Key light (main)
    key_light = bpy.data.lights.new("KeyLight", 'SUN')
    key_light.energy = 2.0
    key_light_obj = bpy.data.objects.new("KeyLight", key_light)
    bpy.context.collection.objects.link(key_light_obj)
    key_light_obj.location = (5, 5, 10)
    
    # Fill light (softer)
    fill_light = bpy.data.lights.new("FillLight", 'SUN')
    fill_light.energy = 1.0
    fill_light_obj = bpy.data.objects.new("FillLight", fill_light)
    bpy.context.collection.objects.link(fill_light_obj)
    fill_light_obj.location = (-5, -5, 10)
    
    # Rim light (back)
    rim_light = bpy.data.lights.new("RimLight", 'SUN')
    rim_light.energy = 0.8
    rim_light_obj = bpy.data.objects.new("RimLight", rim_light)
    bpy.context.collection.objects.link(rim_light_obj)
    rim_light_obj.location = (0, -8, 5)
    
    return [key_light_obj, fill_light_obj, rim_light_obj]

def create_placeholder_model():
    """Create a simple placeholder 3D model"""
    # Add a cube as placeholder
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0))
    
    # Add a simple material
    material = bpy.data.materials.new("PlaceholderMaterial")
    material.use_nodes = True
    material.node_tree.nodes["Principled BSDF"].inputs['Base Color'].default_value = (0.8, 0.8, 0.9, 1)
    material.node_tree.nodes["Principled BSDF"].inputs['Metallic'].default_value = 0.3
    material.node_tree.nodes["Principled BSDF"].inputs['Roughness'].default_value = 0.4
    
    # Apply material to object
    obj = bpy.context.active_object
    obj.data.materials.append(material)
    
    return obj

def render_rotation(camera_obj, rotation_angle, output_path):
    """Render a single rotation"""
    # Rotate camera around origin
    camera_obj.location.x = 5 * math.cos(math.radians(rotation_angle))
    camera_obj.location.y = 5 * math.sin(math.radians(rotation_angle))
    
    # Render image
    bpy.context.scene.render.engine = 'CYCLES'
    bpy.context.scene.render.image_settings.file_format = 'PNG'
    bpy.context.scene.render.image_settings.color_mode = 'RGBA'
    bpy.context.scene.render.filepath = output_path
    
    bpy.ops.render.render(write_still=True)
    print(f"Rendered {rotation_angle}° to {output_path}")

def main():
    """Main render function"""
    # Set up scene
    camera_obj = setup_scene()
    setup_lighting()
    placeholder_obj = create_placeholder_model()
    
    # Output directory
    output_dir = os.path.join(os.path.dirname(__file__), "..", "assets", "sprites")
    os.makedirs(output_dir, exist_ok=True)
    
    # Render 8 rotations (0, 45, 90, 135, 180, 225, 270, 315 degrees)
    rotations = [0, 45, 90, 135, 180, 225, 270, 315]
    
    for i, angle in enumerate(rotations):
        output_path = os.path.join(output_dir, f"model_rot_{i:02d}.png")
        render_rotation(camera_obj, angle, output_path)
    
    print(f"Rendered 8 sprite rotations to {output_dir}")

if __name__ == "__main__":
    main()