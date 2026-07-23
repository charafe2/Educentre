import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { navigationRef } from './navigationRef';
import {
  AdminStackParamList, AdminTabParamList, AuthStackParamList,
  MoreStackParamList, ParentTabParamList,
} from './types';

import WelcomeScreen from '../screens/auth/WelcomeScreen';
import AdminLoginScreen from '../screens/auth/AdminLoginScreen';
import ParentLoginScreen from '../screens/auth/ParentLoginScreen';
import ChildSelectScreen from '../screens/auth/ChildSelectScreen';

import DashboardScreen from '../screens/admin/DashboardScreen';
import StudentsScreen from '../screens/admin/StudentsScreen';
import StudentDetailScreen from '../screens/admin/StudentDetailScreen';
import GroupsScreen from '../screens/admin/GroupsScreen';
import CalendarScreen from '../screens/admin/CalendarScreen';
import FinancesScreen from '../screens/admin/FinancesScreen';
import MoreScreen from '../screens/admin/MoreScreen';
import TeachersScreen from '../screens/admin/TeachersScreen';
import AnalyticsScreen from '../screens/admin/AnalyticsScreen';

import AccueilScreen from '../screens/parent/AccueilScreen';
import CoursScreen from '../screens/parent/CoursScreen';
import PresenceScreen from '../screens/parent/PresenceScreen';
import NotesScreen from '../screens/parent/NotesScreen';
import PaiementsScreen from '../screens/parent/PaiementsScreen';

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.blue,
    background: colors.gray50,
    card: colors.white,
    text: colors.black,
    border: colors.gray100,
  },
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShadowVisible: false,
        headerTintColor: colors.black,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <AuthStack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
      <AuthStack.Screen name="AdminLogin" component={AdminLoginScreen} options={{ title: 'Connexion' }} />
      <AuthStack.Screen name="ParentLogin" component={ParentLoginScreen} options={{ title: 'Connexion' }} />
    </AuthStack.Navigator>
  );
}

const AdminStudentsStack = createNativeStackNavigator<AdminStackParamList>();

function StudentsStackNavigator() {
  return (
    <AdminStudentsStack.Navigator
      screenOptions={{
        headerShadowVisible: false,
        headerTintColor: colors.black,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <AdminStudentsStack.Screen
        name="StudentsList" component={StudentsScreen} options={{ headerShown: false }}
      />
      <AdminStudentsStack.Screen
        name="StudentDetail" component={StudentDetailScreen} options={{ title: 'Fiche élève' }}
      />
    </AdminStudentsStack.Navigator>
  );
}

const MoreStack = createNativeStackNavigator<MoreStackParamList>();

function MoreStackNavigator() {
  return (
    <MoreStack.Navigator
      screenOptions={{
        headerShadowVisible: false,
        headerTintColor: colors.black,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <MoreStack.Screen name="MoreHome" component={MoreScreen} options={{ headerShown: false }} />
      <MoreStack.Screen name="Groups" component={GroupsScreen} options={{ title: 'Groupes & Cours' }} />
      <MoreStack.Screen name="Teachers" component={TeachersScreen} options={{ title: 'Professeurs' }} />
      <MoreStack.Screen name="Analytics" component={AnalyticsScreen} options={{ title: 'Analytiques' }} />
    </MoreStack.Navigator>
  );
}

const AdminTabs = createBottomTabNavigator<AdminTabParamList>();

const tabBarStyle = {
  borderTopColor: colors.gray100,
  height: 84,
  paddingTop: 6,
};

function AdminTabsNavigator() {
  return (
    <AdminTabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.blue,
        tabBarInactiveTintColor: colors.gray300,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle,
      }}
    >
      <AdminTabs.Screen
        name="Dashboard" component={DashboardScreen}
        options={{
          title: 'Tableau de bord',
          tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} />,
        }}
      />
      <AdminTabs.Screen
        name="Students" component={StudentsStackNavigator}
        options={{
          title: 'Étudiants',
          tabBarIcon: ({ color, size }) => <Ionicons name="school-outline" size={size} color={color} />,
        }}
      />
      <AdminTabs.Screen
        name="Calendar" component={CalendarScreen}
        options={{
          title: 'Calendrier',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
        }}
      />
      <AdminTabs.Screen
        name="Finances" component={FinancesScreen}
        options={{
          title: 'Finances',
          tabBarIcon: ({ color, size }) => <Ionicons name="wallet-outline" size={size} color={color} />,
        }}
      />
      <AdminTabs.Screen
        name="More" component={MoreStackNavigator}
        options={{
          title: 'Plus',
          tabBarIcon: ({ color, size }) => <Ionicons name="ellipsis-horizontal-circle-outline" size={size} color={color} />,
        }}
      />
    </AdminTabs.Navigator>
  );
}

const ParentTabs = createBottomTabNavigator<ParentTabParamList>();

function ParentTabsNavigator() {
  const { t } = useI18n();
  return (
    <ParentTabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.blue,
        tabBarInactiveTintColor: colors.gray300,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle,
      }}
    >
      <ParentTabs.Screen
        name="Accueil" component={AccueilScreen}
        options={{
          title: t('parentTabs.accueil'),
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <ParentTabs.Screen
        name="Cours" component={CoursScreen}
        options={{
          title: t('parentTabs.cours'),
          tabBarIcon: ({ color, size }) => <Ionicons name="book-outline" size={size} color={color} />,
        }}
      />
      <ParentTabs.Screen
        name="Presence" component={PresenceScreen}
        options={{
          title: t('parentTabs.presence'),
          tabBarIcon: ({ color, size }) => <Ionicons name="checkmark-done-outline" size={size} color={color} />,
        }}
      />
      <ParentTabs.Screen
        name="Notes" component={NotesScreen}
        options={{
          title: t('parentTabs.notes'),
          tabBarIcon: ({ color, size }) => <Ionicons name="ribbon-outline" size={size} color={color} />,
        }}
      />
      <ParentTabs.Screen
        name="Paiements" component={PaiementsScreen}
        options={{
          title: t('parentTabs.paiements'),
          tabBarIcon: ({ color, size }) => <Ionicons name="card-outline" size={size} color={color} />,
        }}
      />
    </ParentTabs.Navigator>
  );
}

export default function RootNavigator() {
  const { role, parentChildren, parentStudent } = useAuth();
  const needsChildSelection = role === 'parent' && parentChildren.length > 1 && !parentStudent;

  return (
    <NavigationContainer ref={navigationRef} theme={theme}>
      {role === 'admin' ? <AdminTabsNavigator />
        : role === 'parent' ? (needsChildSelection ? <ChildSelectScreen /> : <ParentTabsNavigator />)
        : <AuthNavigator />}
    </NavigationContainer>
  );
}
