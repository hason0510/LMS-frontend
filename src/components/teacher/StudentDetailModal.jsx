import React from "react";
import { Modal, Descriptions, Avatar, Typography } from "antd";
import { UserOutlined, MailOutlined, PhoneOutlined, IdcardOutlined, HomeOutlined, CalendarOutlined } from "@ant-design/icons";
import { getUserSecondaryText } from "../../utils/userIdentity";

const { Text } = Typography;

export default function StudentDetailModal({ visible, onClose, student }) {
  if (!student) return null;

  return (
    <Modal
      title="Thông tin chi tiết người học"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
      className="custom-modal"
    >
      <div className="flex flex-col items-center mb-6 mt-4">
        <Avatar
          size={100}
          src={student.imageUrl || student.avatar}
          icon={!student.imageUrl && !student.avatar && <UserOutlined />}
          className="shadow-md border-2 border-primary/20 mb-4"
        />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
          {student.fullName || student.name}
        </h2>
        <Text type="secondary" className="text-lg">
          {getUserSecondaryText(student, "student") || "Chưa cập nhật"}
        </Text>
      </div>

      <Descriptions bordered column={1} size="middle" className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
        <Descriptions.Item label={<span className="flex items-center gap-2"><IdcardOutlined /> Mã số người học</span>}>
          <Text strong>{student.studentNumber || "Chưa cập nhật"}</Text>
        </Descriptions.Item>
        
        <Descriptions.Item label={<span className="flex items-center gap-2"><MailOutlined /> Email</span>}>
          <Text>{student.gmail || student.email || "Chưa cập nhật"}</Text>
        </Descriptions.Item>

        <Descriptions.Item label={<span className="flex items-center gap-2"><PhoneOutlined /> Số điện thoại</span>}>
          <Text>{student.phoneNumber || "Chưa cập nhật"}</Text>
        </Descriptions.Item>

        <Descriptions.Item label={<span className="flex items-center gap-2"><CalendarOutlined /> Ngày sinh</span>}>
          <Text>{student.birthday ? new Date(student.birthday).toLocaleDateString('vi-VN') : "Chưa cập nhật"}</Text>
        </Descriptions.Item>

        <Descriptions.Item label={<span className="flex items-center gap-2"><HomeOutlined /> Địa chỉ</span>}>
          <Text>{student.address || "Chưa cập nhật"}</Text>
        </Descriptions.Item>
      </Descriptions>
    </Modal>
  );
}
