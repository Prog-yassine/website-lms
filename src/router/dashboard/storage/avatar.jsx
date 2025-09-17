import { useState } from "react";
import { ReactComponent as File } from "../../../assets/icons/file.svg";
import { ReactComponent as Image } from "../../../assets/icons/photo.svg";
import { ReactComponent as Video } from "../../../assets/icons/video.svg";
import { ReactComponent as Dots } from "../../../assets/icons/dots-vertical.svg";

const files = [
  { id: 1, name: "Image", type: "image", content: "📷 Image preview here" },
  { id: 2, name: "Image", type: "image", content: "📷 Image preview here" },
];

const iconMap = {
  file: File,
  image: Image,
  video: Video,
};

const AvatarStorage = () => {
  const [selectedFile, setSelectedFile] = useState(files[0]);

  return (
    <div className="w-full h-full flex">
      {/* Sidebar */}
      <div className="w-[300px] h-full border-r border-gray-300 flex-col">
        {files.map((f) => {
          const Icon = iconMap[f.type];
          return (
            <div
              key={f.id}
              className={`w-full flex items-center justify-between px-3 cursor-pointer hover:bg-gray-100 ${
                selectedFile?.id === f.id ? "bg-gray-200" : ""
              }`}
              onClick={() => setSelectedFile(f)}
            >
              <div className="w-full flex items-center space-x-2 py-3">
                <Icon className="w-5 h-5" />
                <h1 className="font-medium">{f.name}</h1>
              </div>
              <Dots className="w-5 cursor-pointer" />
            </div>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="flex-1 h-full p-4">
        {selectedFile ? (
          <div className="text-lg font-medium">{selectedFile.content}</div>
        ) : (
          <div className="text-gray-400">Select a file to view its content</div>
        )}
      </div>
    </div>
  );
};

export default AvatarStorage;
