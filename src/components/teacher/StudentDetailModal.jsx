import React from "react";
import { Modal, Descriptions, Typography } from "antd";
import { MailOutlined, PhoneOutlined, IdcardOutlined, HomeOutlined, CalendarOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import Avatar from "../common/Avatar";

const { Text } = Typography;

export default function StudentDetailModal({ visible, onClose, student }) {
  const { t, i18n } = useTranslation();

  if (!student) return null;

  const notUpdated = t("teacherLists.students.detail.notUpdated");
  const dateLocale = i18n.language?.startsWith("en") ? "en-GB" : "vi-VN";

  return (
    <Modal
      title={t("teacherLists.students.detail.title")}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
      className="custom-modal"
    >
      <div className="flex flex-col items-center mb-6 mt-4">
        <Avatar
          src={student.imageUrl || student.avatar}
          alt={student.fullName || student.name}
          sizeClass="size-24"
          initialsClass="text-4xl"
          className="shadow-md border-2 border-primary/20 mb-4"
        />
        <h2 className="m-0 text-2xl font-bold text-gray-900 dark:text-white">
          {student.fullName || student.name}
        </h2>
      </div>

      <Descriptions bordered column={1} size="middle" className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
        <Descriptions.Item label={<span className="flex items-center gap-2"><IdcardOutlined /> {t("teacherLists.students.detail.studentNumber")}</span>}>
          <Text strong>{student.studentNumber || notUpdated}</Text>
        </Descriptions.Item>

        <Descriptions.Item label={<span className="flex items-center gap-2"><MailOutlined /> {t("teacherLists.students.detail.email")}</span>}>
          <Text>{student.gmail || student.email || notUpdated}</Text>
        </Descriptions.Item>

        <Descriptions.Item label={<span className="flex items-center gap-2"><PhoneOutlined /> {t("teacherLists.students.detail.phone")}</span>}>
          <Text>{student.phoneNumber || notUpdated}</Text>
        </Descriptions.Item>

        <Descriptions.Item label={<span className="flex items-center gap-2"><CalendarOutlined /> {t("teacherLists.students.detail.birthday")}</span>}>
          <Text>{student.birthday ? new Date(student.birthday).toLocaleDateString(dateLocale) : notUpdated}</Text>
        </Descriptions.Item>

        <Descriptions.Item label={<span className="flex items-center gap-2"><HomeOutlined /> {t("teacherLists.students.detail.address")}</span>}>
          <Text>{student.address || notUpdated}</Text>
        </Descriptions.Item>
      </Descriptions>
    </Modal>
  );
}
