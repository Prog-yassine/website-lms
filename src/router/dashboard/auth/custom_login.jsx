import React, { useState } from "react";

import { ReactComponent as RadiustopLeft } from '../../../assets/icons/radius-top-left.svg';
import { ReactComponent as RadiustopRight } from '../../../assets/icons/radius-top-right.svg';
import { ReactComponent as RadiusbottomLeft } from '../../../assets/icons/radius-bottom-left.svg';
import { ReactComponent as RadiusbottomRight } from '../../../assets/icons/radius-bottom-right.svg';
import { ReactComponent as BorderCorners } from '../../../assets/icons/border-corners.svg';

const componentsList = ["container", "box", "emailInput", "passwordInput", "button"];


export default function LoginFormBuilder() {
  const [selectedComponent, setSelectedComponent] = useState("container");

  const [config, setConfig] = useState({
    container: { backgroundColor: "#f4f4f4", border: {}, radius: {} },
    box: { backgroundColor: "#ffffffff", border: {}, radius: {} },
    emailInput: { backgroundColor: "#fff", border: {}, radius: {} },
    passwordInput: { backgroundColor: "#fff", border: {}, radius: {} },
    button: { backgroundColor: "#007bff", color: "#fff", fontSize: 16, border: {}, radius: {} }
  });

  const [openPanels, setOpenPanels] = useState({
    container: { background: true, border: true, padding: true },
    box: { background: true, border: true },
    emailInput: { background: true, border: true },
    passwordInput: { background: true, border: true },
    button: { background: true, border: true, typography: true }
  });

  const [separateRadius, setSeparateRadius] = useState({
    container: false,
    box: false,
    emailInput: false,
    passwordInput: false,
    button: false
  });

  const [separateBorderWidth, setSeparateBorderWidth] = useState({
    container: false,
    box: false,
    emailInput: false,
    passwordInput: false,
    button: false
  });

  const togglePanel = (component, panel) => {
    setOpenPanels(prev => ({
      ...prev,
      [component]: { ...prev[component], [panel]: !prev[component][panel] }
    }));
  };

  const handleConfigChange = (component, key, value) => {
    setConfig(prev => ({
      ...prev,
      [component]: { ...prev[component], [key]: value }
    }));
  };

  const renderBorderControls = component => {
    const c = config[component];

    return (
      <div onClick={e => e.stopPropagation()} className="space-y-4 py-4">
        {/* Toggle border width separate */}
        <div className="flex space-x-2 items-center">
          <div
            className={`w-7 h-7 cursor-pointer rounded-lg ${separateBorderWidth[component] ? 'bg-red-500' : 'bg-green-500'}`}
            title={separateBorderWidth[component] ? "Separate border widths ON" : "Separate border widths OFF"}
            onClick={() =>
              setSeparateBorderWidth(prev => ({ ...prev, [component]: !prev[component] }))
            }
          ></div>
          <h1>Width</h1>
        </div>

        {/* Border Width */}
        {!separateBorderWidth[component] ? (
          <div className="flex items-center gap-2">
            <label className="whitespace-nowrap">Border width:</label>
            <input
              type="number"
              value={c.border?.width || 0}
              onChange={e =>
                handleConfigChange(component, "border", {
                  ...c.border,
                  width: e.target.value
                })
              }
              className="flex-1 border border-gray-300 rounded px-2 py-1"
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {["top", "right", "bottom", "left"].map(side => (
              <div key={side} className="flex flex-col">
                <label className="whitespace-nowrap text-sm">{side} width:</label>
                <input
                  type="number"
                  value={c.border?.[`${side}Width`] || 0}
                  onChange={e =>
                    handleConfigChange(component, "border", {
                      ...c.border,
                      [`${side}Width`]: e.target.value
                    })
                  }
                  className="border border-gray-300 rounded px-2 py-1"
                />
              </div>
            ))}
          </div>
        )}

        {/* Border Color */}
        <div className="flex items-center gap-2">
          <label className="whitespace-nowrap">Border color:</label>
          <input
            type="color"
            value={c.border?.color || "#000000"}
            onChange={e =>
              handleConfigChange(component, "border", {
                ...c.border,
                color: e.target.value
              })
            }
            className="w-7 h-7"
          />
          <input
            type="text"
            value={c.border?.color || "#000000"}
            onChange={e =>
              handleConfigChange(component, "border", {
                ...c.border,
                color: e.target.value
              })
            }
            className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
          />
        </div>

        {/* Border Style */}
        <div className="flex items-center gap-2">
          <label className="whitespace-nowrap">Border style:</label>
          <select
            value={c.border?.style || "solid"}
            onChange={e =>
              handleConfigChange(component, "border", {
                ...c.border,
                style: e.target.value
              })
            }
            className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
          >
            <option value="solid">Solid</option>
            <option value="dashed">Dashed</option>
            <option value="dotted">Dotted</option>
          </select>
        </div>

        {/* Toggle radius separate */}
        <div className="flex space-x-2 items-center">
          <div
            className={`w-9 h-9 flex items-center justify-center cursor-pointer rounded-lg ${separateRadius[component] ? 'bg-emerald-100' : ''}`}
            title={separateRadius[component] ? "Separate corners ON" : "Separate corners OFF"}
            onClick={() =>
              setSeparateRadius(prev => ({ ...prev, [component]: !prev[component] }))
            }
          >
            <BorderCorners className="w-7 h-7 text-gray-900" />
          </div>
          <h1 className="select-none">Radius</h1>
        </div>

        {/* Border Radius */}
        {!separateRadius[component] ? (
          <div className="flex items-center border border-gray-300 pl-2 rounded-lg gap-2" >
            <div>
              <BorderCorners className="w-7 h-7 text-gray-600" />
            </div>
            <input
              type="number"
              value={c.radius?.all || 0}
              onChange={e =>
                handleConfigChange(component, "radius", {
                  ...c.radius,
                  all: e.target.value
                })
              }
              className="flex-1 px-2 h-10 outline-none border-l border-gray-300"
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {["topLeft", "topRight", "bottomLeft", "bottomRight"].map(corner => (
              <div key={corner} className="flex items-center gap-0">
                {/* Icon Box */}
                <div className={`w-10 h-10 flex items-center justify-center border border-gray-300 rounded-l-lg bg-gray-50 `}>
                  {corner === "topLeft" && <RadiustopLeft className="w-5 h-5 text-gray-600" />}
                  {corner === "topRight" && <RadiustopRight className="w-5 h-5 text-gray-600" />}
                  {corner === "bottomLeft" && <RadiusbottomLeft className="w-5 h-5 text-gray-600" />}
                  {corner === "bottomRight" && <RadiusbottomRight className="w-5 h-5 text-gray-600" />}
                </div>

                {/* Input */}
                <input
                  type="number"
                  value={c.radius?.[corner] || 0}
                  onChange={e =>
                    handleConfigChange(component, "radius", {
                      ...c.radius,
                      [corner]: e.target.value
                    })
                  }
                  className="border border-l-0 border-gray-300 rounded-r-lg h-10 w-24 px-2 focus:outline-none"
                />
              </div>
            ))}
          </div>

        )}
      </div>
    );
  };



  const renderBackgroundControls = component => {
    const c = config[component];

    return (
      <div
        onClick={e => e.stopPropagation()}
        className="flex items-center gap-2 py-2"
      >
        {/* Color Picker */}
        <input
          type="color"
          value={c.backgroundColor}
          onChange={e => handleConfigChange(component, "backgroundColor", e.target.value)}
          className="w-7 h-7"
        />

        {/* HEX Input */}
        <input
          type="text"
          value={c.backgroundColor}
          onChange={e => handleConfigChange(component, "backgroundColor", e.target.value)}
          className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm outline-none"
          placeholder="#FFFFFF"
        />
      </div>
    );
  };


  const renderTypographyControls = component => {
    const c = config[component];
    return (
      <div onClick={e => e.stopPropagation()} className="space-y-1 py-1">
        <div className="flex items-center gap-2">
          <label className="whitespace-nowrap">Text color:</label>
          <input
            type="color"
            value={c.color || "#000000"}
            onChange={e => handleConfigChange(component, "color", e.target.value)}
            className="border border-gray-300 rounded w-8 h-8"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="whitespace-nowrap">Font size:</label>
          <input
            type="number"
            value={c.fontSize || 16}
            onChange={e =>
              handleConfigChange(component, "fontSize", parseInt(e.target.value, 10))
            }
            className="flex-1 border border-gray-300 rounded px-2 py-1"
          />
        </div>

      </div>
    );
  };

  const getComponentStyle = component => {
    const c = config[component];
    const borderStyle = separateBorderWidth[component]
      ? {
          borderTop: `${c.border?.topWidth || 0}px ${c.border?.style || "solid"} ${
            c.border?.color || "#000"
          }`,
          borderRight: `${c.border?.rightWidth || 0}px ${c.border?.style || "solid"} ${
            c.border?.color || "#000"
          }`,
          borderBottom: `${c.border?.bottomWidth || 0}px ${c.border?.style || "solid"} ${
            c.border?.color || "#000"
          }`,
          borderLeft: `${c.border?.leftWidth || 0}px ${c.border?.style || "solid"} ${
            c.border?.color || "#000"
          }`
        }
      : {
          border: `${c.border?.width || 0}px ${c.border?.style || "solid"} ${
            c.border?.color || "#000"
          }`
        };
    const radiusStyle = separateRadius[component]
      ? {
          borderTopLeftRadius: `${c.radius?.topLeft || 0}px`,
          borderTopRightRadius: `${c.radius?.topRight || 0}px`,
          borderBottomRightRadius: `${c.radius?.bottomRight || 0}px`,
          borderBottomLeftRadius: `${c.radius?.bottomLeft || 0}px`
        }
      : { borderRadius: `${c.radius?.all || 0}px` };
    return {
      backgroundColor: c.backgroundColor,
      color: c.color,
      fontSize: c.fontSize,
      ...borderStyle,
      ...radiusStyle
    };
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Left Sidebar */}
      <div style={{ width: "250px", background: "#eee", padding: "10px" }}>
        {componentsList.map(comp => (
          <div
            key={comp}
            onClick={() => setSelectedComponent(comp)}
            style={{
              padding: "6px",
              marginBottom: "4px",
              cursor: "pointer",
              background: selectedComponent === comp ? "#ddd" : "transparent"
            }}
          >
            {comp}
          </div>
        ))}
      </div>

      {/* Preview */}
      <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div style={getComponentStyle("container")}>
          <div style={{ ...getComponentStyle("box"), display: "flex", flexDirection: "column", gap: "12px" }}>
            
            {/* Email Input */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <input
                placeholder="Email"
                style={{
                  ...getComponentStyle("emailInput"),
                  width: "100%",
                  padding: "8px",
                  boxSizing: "border-box"
                }}
              />
            </div>

            {/* Password Input */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <input
                placeholder="Password"
                type="password"
                style={{
                  ...getComponentStyle("passwordInput"),
                  width: "100%",
                  padding: "8px",
                  boxSizing: "border-box"
                }}
              />
            </div>

            {/* Button */}
            <button
              style={{
                ...getComponentStyle("button"),
                width: "100%",
                padding: "10px",
                cursor: "pointer"
              }}
            >
              Login
            </button>
          </div>
        </div>
      </div>


      {/* Right Sidebar */}
      <div style={{ width: "300px", background: "#fafafa", padding: "10px" }}>
        {openPanels[selectedComponent]?.border && (
          <div>
            <div
              style={{ cursor: "pointer", fontWeight: "bold", padding: "4px", background: "#f4f4f4" }}
              onClick={() => togglePanel(selectedComponent, "border")}
            >
              Border
            </div>
            {openPanels[selectedComponent].border && renderBorderControls(selectedComponent)}
          </div>
        )}
        {openPanels[selectedComponent]?.background && (
          <div>
            <div
              style={{ cursor: "pointer", fontWeight: "bold", padding: "4px", background: "#f4f4f4" }}
              onClick={() => togglePanel(selectedComponent, "background")}
            >
              Fill
            </div>
            {openPanels[selectedComponent].background &&
              renderBackgroundControls(selectedComponent)}
          </div>
        )}
        {openPanels[selectedComponent]?.typography && (
          <div>
            <div
              style={{ cursor: "pointer", fontWeight: "bold", padding: "4px", background: "#f4f4f4" }}
              onClick={() => togglePanel(selectedComponent, "typography")}
            >
              Typography
            </div>
            {openPanels[selectedComponent].typography &&
              renderTypographyControls(selectedComponent)}
          </div>
        )}
      </div>
    </div>
  );
}
