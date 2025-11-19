
import { GoogleGenAI, Type } from "@google/genai";
import { Dimensions, WardrobeDesign } from "../types";

// Initialize the API client
// CRITICAL: The API key MUST be a process.env variable.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateWardrobeLayouts = async (dimensions: Dimensions): Promise<WardrobeDesign[]> => {
  const { width, height, depth, unit } = dimensions;

  const prompt = `
    I need to design the interior of a wardrobe with dimensions: 
    Width: ${width} ${unit}, Height: ${height} ${unit}, Depth: ${depth} ${unit}.
    
    Please generate 3 distinct interior layout options (e.g., "Max Storage", "His & Hers", "Minimalist Hanging").
    
    The design should include appropriate provisions for:
    - Drawers (typically at bottom or waist height)
    - Shelves (for folded clothes)
    - Hanging rods (short for shirts, long for dresses/coats)
    - Long shelves (top storage)
    - Lighting provisions (mention in features)
    
    Output strictly valid JSON following the schema provided. 
    Use percentages for widths and heights to allow scaling.
    Ensure the sum of column widthPercentages is approx 100.
    Ensure the sum of item heightPercentages in a column is approx 100 (excluding the top shelf if present).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              features: { type: Type.ARRAY, items: { type: Type.STRING } },
              layout: {
                type: Type.OBJECT,
                properties: {
                  topShelfHeightPercentage: { type: Type.NUMBER, description: "Optional height % for a full-width top shelf (e.g. 15). Set to 0 if none." },
                  columns: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        widthPercentage: { type: Type.NUMBER },
                        items: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              type: { 
                                type: Type.STRING, 
                                enum: ["Shelf", "Drawer", "Hanging Rod", "Long Shelf", "Shoe Rack", "Empty Space"] 
                              },
                              heightPercentage: { type: Type.NUMBER },
                              label: { type: Type.STRING }
                            },
                            required: ["type", "heightPercentage"]
                          }
                        }
                      },
                      required: ["widthPercentage", "items"]
                    }
                  }
                },
                required: ["columns"]
              }
            },
            required: ["id", "name", "description", "layout", "features"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No data returned from Gemini");
    
    return JSON.parse(text) as WardrobeDesign[];
  } catch (error) {
    console.error("Error generating layouts:", error);
    throw error;
  }
};

// Helper to get descriptive text for items
const getItemDescription = (type: string) => {
  switch (type) {
      case 'Drawer': return 'a set of closed wooden drawers';
      case 'Hanging Rod': return 'a hanging rail with clothes';
      case 'Shelf': return 'open shelves with folded items';
      case 'Long Shelf': return 'wide upper storage shelf';
      case 'Shoe Rack': return 'angled shoe display racks';
      case 'Empty Space': return 'an open empty void or tall gap';
      default: return type;
  }
};

export const generatePhotorealisticImage = async (design: WardrobeDesign, dimensions: Dimensions): Promise<string> => {
  const { width, height, unit } = dimensions;

  // Construct a detailed structural description based on the edited layout
  // We map columns left-to-right, and items top-to-bottom
  const layoutDescription = design.layout.columns.map((col, i) => {
    const widthDesc = Math.round(col.widthPercentage);
    
    const itemsDesc = col.items.map(item => {
      const h = Math.round(item.heightPercentage);
      // Emphasize position
      return `    - [Height: ${h}%] ${getItemDescription(item.type)}`;
    }).join('\n');

    return `  COLUMN ${i + 1} (Position: ${i === 0 ? 'Left' : i === design.layout.columns.length - 1 ? 'Right' : 'Center'}, Width: ${widthDesc}%):\n${itemsDesc}`;
  }).join('\n\n');

  const topShelfDesc = design.layout.topShelfHeightPercentage && design.layout.topShelfHeightPercentage > 5
    ? `  TOP SECTION: A continuous full-width top shelf (Height: ${Math.round(design.layout.topShelfHeightPercentage)}%) spanning the entire width.`
    : "";

  const prompt = `
    Generate a photorealistic interior design architectural render of a CUSTOM built-in wardrobe.
    
    DIMENSIONS: ${width}${unit} Wide x ${height}${unit} High.
    
    VIEW: Front elevation, eye-level, straight on.
    
    STRUCTURAL LAYOUT (Must be followed EXACTLY left-to-right):
    
    ${topShelfDesc}
    
    ${layoutDescription}
    
    DETAILS:
    - Style: Modern, premium joinery.
    - Material: Light oak wood interior, white trim.
    - Lighting: Integrated LED strips in vertical dividers.
    - Content: Realistic clothes, shoes, and boxes where specified. 
    - Empty Space: If specified, leave that section strictly empty.
    
    CRITICAL INSTRUCTION:
    Do not use a generic template. You must render EXACTLY ${design.layout.columns.length} vertical columns with the specific widths and item arrangements listed above.
  `;

  console.log("Generating Image with Prompt:", prompt);

  try {
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        aspectRatio: '1:1', 
        outputMimeType: 'image/jpeg'
      }
    });

    const base64Image = response.generatedImages?.[0]?.image?.imageBytes;
    if (base64Image) {
      return `data:image/jpeg;base64,${base64Image}`;
    }
    throw new Error("No image generated");
  } catch (error) {
    console.error("Error generating image:", error);
    // Fallback
    return "https://picsum.photos/1024/1024?blur=2";
  }
};
