#!/usr/bin/env python3
"""
Convert ARC puzzle JSON files to PNG images.
Creates two files:
- <filename>-puzzle.png: Shows all train examples and test input
- <filename>-answer.png: Shows test output
"""

import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw
import argparse

# ARC color mapping (0-9)
ARC_COLORS = {
    0: (0, 0, 0),  # black
    1: (0, 116, 217),  # blue
    2: (255, 65, 54),  # red
    3: (46, 204, 64),  # green
    4: (255, 220, 0),  # yellow
    5: (170, 170, 170),  # gray
    6: (240, 18, 190),  # magenta
    7: (255, 133, 27),  # orange
    8: (127, 219, 255),  # sky
    9: (128, 0, 0),  # maroon
}

CELL_SIZE = 20  # Size of each cell in pixels
GRID_PADDING = 0  # Padding between cells (white grid lines)
GRID_SPACING = 20  # Space between grids
LABEL_HEIGHT = 30  # Height for labels above grids
MARGIN = 20  # Margin around the entire image


def draw_grid(draw, grid, x_offset, y_offset, cell_size, grid_padding):
    """Draw a single grid at the given offset."""
    if not grid or len(grid) == 0:
        return

    height = len(grid)
    width = len(grid[0]) if height > 0 else 0

    for y in range(height):
        for x in range(width):
            color_id = grid[y][x] if y < len(grid) and x < len(grid[y]) else 0
            color = ARC_COLORS.get(color_id, ARC_COLORS[0])

            # Calculate cell position
            cell_x = x_offset + x * (cell_size + grid_padding)
            cell_y = y_offset + y * (cell_size + grid_padding)

            # Draw cell
            draw.rectangle(
                [cell_x, cell_y, cell_x + cell_size - 1, cell_y + cell_size - 1],
                fill=color,
                outline=(100, 100, 100),
            )


def draw_blank_grid(draw, width, height, x_offset, y_offset, cell_size, grid_padding):
    """Draw a blank (white) grid with outlines."""
    for y in range(height):
        for x in range(width):
            # Calculate cell position
            cell_x = x_offset + x * (cell_size + grid_padding)
            cell_y = y_offset + y * (cell_size + grid_padding)

            # Draw blank cell (white with outline)
            draw.rectangle(
                [cell_x, cell_y, cell_x + cell_size - 1, cell_y + cell_size - 1],
                fill=(255, 255, 255),
                outline=(200, 200, 200),
            )


def get_grid_size(grid):
    """Get the dimensions of a grid."""
    if not grid or len(grid) == 0:
        return (0, 0)
    return (len(grid[0]) if len(grid) > 0 else 0, len(grid))


def create_puzzle_image(data):
    """Create image showing all train examples and test input."""
    train = data.get("train", [])
    test = data.get("test", [])

    if not train and not test:
        raise ValueError("No train or test data found")

    # Calculate layout for examples (left side)
    examples_width = 0
    examples_height = 0
    train_info = []

    # Process train examples
    for i, example in enumerate(train):
        input_grid = example.get("input", [])
        output_grid = example.get("output", [])

        input_w, input_h = get_grid_size(input_grid)
        output_w, output_h = get_grid_size(output_grid)

        # Grid width is input + spacing + output
        grid_width = (
            input_w * (CELL_SIZE + GRID_PADDING)
            + GRID_SPACING
            + output_w * (CELL_SIZE + GRID_PADDING)
        )
        grid_height = max(input_h, output_h) * (CELL_SIZE + GRID_PADDING)

        examples_width = max(examples_width, grid_width)
        train_info.append(
            {
                "index": i,
                "input": input_grid,
                "output": output_grid,
                "input_size": (input_w, input_h),
                "output_size": (output_w, output_h),
                "height": grid_height,
            }
        )
        examples_height += (
            grid_height + LABEL_HEIGHT * 2 + GRID_SPACING
        )  # Extra LABEL_HEIGHT for "input"/"output" labels

    # Process test input (right side)
    test_info = None
    test_width = 0
    if test and len(test) > 0:
        test_input = test[0].get("input", [])
        test_output = test[0].get("output", [])
        test_w, test_h = get_grid_size(test_input)
        
        # Get output dimensions (use input dimensions if output doesn't exist)
        if test_output:
            output_w, output_h = get_grid_size(test_output)
        else:
            output_w, output_h = test_w, test_h
        
        test_width = max(test_w, output_w) * (CELL_SIZE + GRID_PADDING)
        test_info = {
            "input": test_input,
            "output": test_output,
            "input_size": (test_w, test_h),
            "output_size": (output_w, output_h),
            "input_height": test_h * (CELL_SIZE + GRID_PADDING),
            "output_height": output_h * (CELL_SIZE + GRID_PADDING),
        }

    # Calculate total image dimensions
    left_column_width = examples_width + 2 * MARGIN
    right_column_width = test_width + 2 * MARGIN if test_info else 0
    column_spacing = GRID_SPACING * 2  # Space between left and right columns

    img_width = left_column_width + column_spacing + right_column_width
    
    # Calculate test column height (input + output + labels)
    test_column_height = 0
    if test_info:
        test_column_height = (
            LABEL_HEIGHT  # "Test" label
            + LABEL_HEIGHT  # "Input" label
            + test_info["input_height"]  # Input grid
            + GRID_SPACING  # Space between input and output
            + LABEL_HEIGHT  # "Output" label
            + test_info["output_height"]  # Output grid
        )
    
    img_height = max(examples_height, test_column_height) + MARGIN

    img = Image.new("RGB", (img_width, img_height), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)

    # Draw train examples on the left and track Example 2's output position
    y_pos = MARGIN
    example2_output_y = None
    for info in train_info:
        # Draw example label
        label = f"Example {info['index'] + 1}"
        draw.text((MARGIN, y_pos), label, fill=(0, 0, 0))
        y_pos += LABEL_HEIGHT

        # Draw input and output side by side
        input_w, input_h = info["input_size"]
        output_w, output_h = info["output_size"]

        input_x = MARGIN
        input_y = y_pos + LABEL_HEIGHT  # Space for "input" label

        # Draw "input" label
        draw.text((input_x, y_pos), "Input", fill=(0, 0, 0))

        draw_grid(draw, info["input"], input_x, input_y, CELL_SIZE, GRID_PADDING)

        output_x = input_x + input_w * (CELL_SIZE + GRID_PADDING) + GRID_SPACING
        output_y = y_pos + LABEL_HEIGHT  # Space for "output" label

        # Draw "output" label
        draw.text((output_x, y_pos), "Output", fill=(0, 0, 0))

        draw_grid(draw, info["output"], output_x, output_y, CELL_SIZE, GRID_PADDING)

        # Track Example 2's output grid Y position
        if info["index"] == 1:  # Example 2 (0-indexed, so index 1)
            example2_output_y = output_y

        y_pos += LABEL_HEIGHT + info["height"] + GRID_SPACING

    # Draw test input and output on the right
    if test_info:
        test_x = left_column_width + column_spacing + MARGIN
        test_y = MARGIN

        # Draw "Test" label (aligned with "Example X" labels)
        draw.text((test_x, test_y), "Test", fill=(0, 0, 0))
        test_y += LABEL_HEIGHT

        # Draw "Input" label (aligned with train examples' "input" labels)
        draw.text((test_x, test_y), "Input", fill=(0, 0, 0))
        test_y += LABEL_HEIGHT

        # Draw test input grid below the label
        draw_grid(draw, test_info["input"], test_x, test_y, CELL_SIZE, GRID_PADDING)

        # Draw "Output" label and blank grid aligned with Example 2's output
        output_w, output_h = test_info["output_size"]
        
        # Use Example 2's output Y position if available, otherwise position below input
        if example2_output_y is not None:
            # Align with Example 2's output
            test_output_y = example2_output_y
            # Draw "Output" label above the grid (same Y as Example 2's output label)
            output_label_y = test_output_y - LABEL_HEIGHT
            draw.text((test_x, output_label_y), "Output", fill=(0, 0, 0))
        else:
            # Fallback: position below input
            test_y += test_info["input_height"] + GRID_SPACING
            draw.text((test_x, test_y), "Output", fill=(0, 0, 0))
            test_y += LABEL_HEIGHT
            test_output_y = test_y

        # Draw blank grid (white with outlines)
        draw_blank_grid(draw, output_w, output_h, test_x, test_output_y, CELL_SIZE, GRID_PADDING)

    return img


def create_examples_image(data):
    """Create image showing only train examples (no test grids)."""
    train = data.get("train", [])

    if not train:
        raise ValueError("No train data found")

    # Calculate layout for examples
    examples_width = 0
    examples_height = 0
    train_info = []

    # Process train examples
    for i, example in enumerate(train):
        input_grid = example.get("input", [])
        output_grid = example.get("output", [])

        input_w, input_h = get_grid_size(input_grid)
        output_w, output_h = get_grid_size(output_grid)

        # Grid width is input + spacing + output
        grid_width = (
            input_w * (CELL_SIZE + GRID_PADDING)
            + GRID_SPACING
            + output_w * (CELL_SIZE + GRID_PADDING)
        )
        grid_height = max(input_h, output_h) * (CELL_SIZE + GRID_PADDING)

        examples_width = max(examples_width, grid_width)
        train_info.append(
            {
                "index": i,
                "input": input_grid,
                "output": output_grid,
                "input_size": (input_w, input_h),
                "output_size": (output_w, output_h),
                "height": grid_height,
            }
        )
        examples_height += (
            grid_height + LABEL_HEIGHT * 2 + GRID_SPACING
        )  # Extra LABEL_HEIGHT for "input"/"output" labels

    # Create image
    img_width = examples_width + 2 * MARGIN
    img_height = examples_height + MARGIN

    img = Image.new("RGB", (img_width, img_height), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)

    # Draw train examples
    y_pos = MARGIN
    for info in train_info:
        # Draw example label
        label = f"Example {info['index'] + 1}"
        draw.text((MARGIN, y_pos), label, fill=(0, 0, 0))
        y_pos += LABEL_HEIGHT

        # Draw input and output side by side
        input_w, input_h = info["input_size"]
        output_w, output_h = info["output_size"]

        input_x = MARGIN
        input_y = y_pos + LABEL_HEIGHT  # Space for "input" label

        # Draw "input" label
        draw.text((input_x, y_pos), "Input", fill=(0, 0, 0))

        draw_grid(draw, info["input"], input_x, input_y, CELL_SIZE, GRID_PADDING)

        output_x = input_x + input_w * (CELL_SIZE + GRID_PADDING) + GRID_SPACING
        output_y = y_pos + LABEL_HEIGHT  # Space for "output" label

        # Draw "output" label
        draw.text((output_x, y_pos), "Output", fill=(0, 0, 0))

        draw_grid(draw, info["output"], output_x, output_y, CELL_SIZE, GRID_PADDING)

        y_pos += LABEL_HEIGHT + info["height"] + GRID_SPACING

    return img


def create_test_image(data):
    """Create image showing test input and blank output (vertical layout, like RHS of puzzle)."""
    test = data.get("test", [])

    if not test or len(test) == 0:
        raise ValueError("No test data found")

    test_input = test[0].get("input", [])
    test_output = test[0].get("output", [])

    if not test_input:
        raise ValueError("No test input found")

    input_w, input_h = get_grid_size(test_input)
    # Use output dimensions if available, otherwise use input dimensions
    if test_output:
        output_w, output_h = get_grid_size(test_output)
    else:
        output_w, output_h = input_w, input_h

    # Calculate image dimensions (vertical layout)
    grid_width = max(input_w, output_w) * (CELL_SIZE + GRID_PADDING)
    input_height = input_h * (CELL_SIZE + GRID_PADDING)
    output_height = output_h * (CELL_SIZE + GRID_PADDING)

    img_width = grid_width + 2 * MARGIN
    img_height = (
        LABEL_HEIGHT  # "Test" label
        + LABEL_HEIGHT  # "Input" label
        + input_height  # Input grid
        + GRID_SPACING  # Space between input and output
        + LABEL_HEIGHT  # "Output" label
        + output_height  # Output grid
        + MARGIN
    )

    img = Image.new("RGB", (img_width, img_height), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)

    test_x = MARGIN
    test_y = MARGIN

    # Draw "Test" label
    draw.text((test_x, test_y), "Test", fill=(0, 0, 0))
    test_y += LABEL_HEIGHT

    # Draw "Input" label
    draw.text((test_x, test_y), "Input", fill=(0, 0, 0))
    test_y += LABEL_HEIGHT

    # Draw test input grid
    draw_grid(draw, test_input, test_x, test_y, CELL_SIZE, GRID_PADDING)
    test_y += input_height + GRID_SPACING

    # Draw "Output" label
    draw.text((test_x, test_y), "Output", fill=(0, 0, 0))
    test_y += LABEL_HEIGHT

    # Draw blank output grid (always blank, regardless of whether output exists in data)
    draw_blank_grid(draw, output_w, output_h, test_x, test_y, CELL_SIZE, GRID_PADDING)

    return img


def create_answer_image(data):
    """Create image showing test output."""
    test = data.get("test", [])

    if not test or len(test) == 0:
        raise ValueError("No test data found")

    test_output = test[0].get("output", [])

    if not test_output or len(test_output) == 0:
        raise ValueError("No test output found")

    output_w, output_h = get_grid_size(test_output)

    # Create image
    img_width = output_w * (CELL_SIZE + GRID_PADDING) + 2 * MARGIN
    img_height = output_h * (CELL_SIZE + GRID_PADDING) + LABEL_HEIGHT + 2 * MARGIN
    img = Image.new("RGB", (img_width, img_height), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)

    # Draw label
    draw.text((MARGIN, MARGIN), "Test Output", fill=(0, 0, 0))

    # Draw output grid
    output_x = MARGIN
    output_y = MARGIN + LABEL_HEIGHT
    draw_grid(draw, test_output, output_x, output_y, CELL_SIZE, GRID_PADDING)

    return img


def main():
    parser = argparse.ArgumentParser(
        description="Convert ARC puzzle JSON to PNG images"
    )
    parser.add_argument("json_file", type=str, help="Path to JSON file")
    parser.add_argument(
        "--output-dir",
        type=str,
        default=None,
        help="Output directory (default: same as input file)",
    )

    args = parser.parse_args()

    # Read JSON file
    json_path = Path(args.json_file)
    if not json_path.exists():
        print(f"Error: File not found: {json_path}", file=sys.stderr)
        sys.exit(1)

    with open(json_path, "r") as f:
        data = json.load(f)

    # Determine output directory
    if args.output_dir:
        output_dir = Path(args.output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
    else:
        output_dir = json_path.parent

    # Get base filename
    base_name = json_path.stem

    # Create puzzle image
    try:
        puzzle_img = create_puzzle_image(data)
        puzzle_path = output_dir / f"{base_name}-puzzle.png"
        puzzle_img.save(puzzle_path)
        print(f"Created: {puzzle_path}")
    except Exception as e:
        print(f"Error creating puzzle image: {e}", file=sys.stderr)
        sys.exit(1)

    # Create examples image (train examples only)
    try:
        examples_img = create_examples_image(data)
        examples_path = output_dir / f"{base_name}-examples.png"
        examples_img.save(examples_path)
        print(f"Created: {examples_path}")
    except Exception as e:
        print(f"Error creating examples image: {e}", file=sys.stderr)
        sys.exit(1)

    # Create test image (test input and output)
    try:
        test_img = create_test_image(data)
        test_path = output_dir / f"{base_name}-test.png"
        test_img.save(test_path)
        print(f"Created: {test_path}")
    except ValueError as e:
        print(f"Warning: {e}. Skipping test image.", file=sys.stderr)
    except Exception as e:
        print(f"Error creating test image: {e}", file=sys.stderr)
        # Don't exit on test image error, continue with answer image

    # Create answer image
    try:
        answer_img = create_answer_image(data)
        answer_path = output_dir / f"{base_name}-answer.png"
        answer_img.save(answer_path)
        print(f"Created: {answer_path}")
    except ValueError as e:
        print(f"Warning: {e}. Skipping answer image.", file=sys.stderr)
    except Exception as e:
        print(f"Error creating answer image: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
