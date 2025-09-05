import { useState } from "react";
import Editor from "@monaco-editor/react";

const templateDefaults = {
  magic_link: `<h2>You have been invited</h2>
<p>You have been invited to create a user on {{ .SiteURL }}. Follow this link to accept the invite:</p>
<p><a href="{{ .ConfirmationURL }}">Accept the invite</a></p>`,

  reset_password: `<h2>Password Reset</h2>
<p>To reset your password, click the link below:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>`,

  change_email: `<h2>Email Change Request</h2>
<p>Click the link below to confirm your new email:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm Email Change</a></p>`,

  invite_user: `<h2>You've been invited</h2>
<p>Someone invited you to join {{ .SiteURL }}. Use the link below:</p>
<p><a href="{{ .ConfirmationURL }}">Join Now</a></p>`,
};

const TemplatesTab = () => {
  const [templateType, setTemplateType] = useState("magic_link");
  const [activeTab, setActiveTab] = useState("editor");
  const [htmlCode, setHtmlCode] = useState(templateDefaults["magic_link"]);

  const handleTemplateChange = (type) => {
    setTemplateType(type);
    setHtmlCode(templateDefaults[type]); // reset to default code
  };

  return (
    <div className="w-full h-auto border border-gray-300 rounded-lg bg-white my-10">
      {/* Template Type Tabs */}
      <div className="h-13 border-b border-gray-300 px-5 flex items-center space-x-4">
        {[
          { label: "Magic Link", key: "magic_link" },
          { label: "Reset Password", key: "reset_password" },
          { label: "Change Email", key: "change_email" },
          { label: "Invite User", key: "invite_user" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTemplateChange(tab.key)}
            className={`h-full border-b-2 font-medium cursor-pointer px-3 py-2 text-sm ${
              templateType === tab.key
                ? "border-black text-black"
                : "border-transparent text-gray-500"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Subject Heading */}
      <div className="w-full py-5 px-7 flex-col space-y-2 border-b border-gray-300">
        <h1 className="font-medium">Subject heading</h1>
        <input
          type="text"
          className="border border-gray-300 rounded-lg bg-gray-100 py-2 px-3 w-full outline-gray-200"
          value={`Your ${templateType.replace("_", " ")}`}
          readOnly
        />
      </div>

      {/* Message Body Title */}
      <h1 className="font-medium pt-5 pb-2 px-7">Message body</h1>

      {/* Editor / Preview Tabs */}
      <div className="flex border-b border-gray-200 px-7">
        <button
          onClick={() => setActiveTab("editor")}
          className={`px-4 py-2 text-sm font-medium cursor-pointer ${
            activeTab === "editor"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600 border-b-2 border-white"
          }`}
        >
          Editor
        </button>
        <button
          onClick={() => setActiveTab("preview")}
          className={`ml-4 px-4 py-2 text-sm font-medium cursor-pointer ${
            activeTab === "preview"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600 border-b-2 border-white"
          }`}
        >
          Preview
        </button>
      </div>

      {/* Content Based on Tab */}
      <div className="p-7">
        {activeTab === "editor" && (
          <div>
            <Editor
              height="500px"
              language="html"
              theme="vs-light"
              value={htmlCode}
              onChange={(value) => setHtmlCode(value || "")}
            />
          </div>
        )}

        {activeTab === "preview" && (
          <div className="border border-gray-300 rounded-md w-full h-[500px] bg-white">
            <iframe
              className="w-full h-full"
              srcDoc={htmlCode}
              title="Live Preview"
            />
          </div>
        )}
      </div>
      <div className="border-t border-gray-300 py-5 px-7 flex items-center">
        <h1>Email content is unlikely to be marked as spam</h1>
      </div>
      <div className="border-t border-gray-300 py-5 px-7 flex items-center justify-end">
        <button className="bg-emerald-200 border-emerald-400 border px-3 py-1 rounded-lg hover:bg-emerald-300 hover:border-emerald-500 cursor-pointer">Save changes</button>
      </div>
    </div>
  );
};

export default TemplatesTab;
